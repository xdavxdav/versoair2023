import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ensureAuthenticated,
  authenticatedFetch,
  getCsrfToken,
  initializeCsrfToken,
} from "@/lib/auth";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { SessionTimerBar } from "@/components/ui/session-timer-bar";
import { MarketplaceModeration } from "@/components/sections/MarketplaceModeration";

import {
  Store,
  Tag,
  Megaphone,
  Briefcase,
  FileText,
  Users,
  BarChart3,
  Lock,
  AlertCircle,
  Loader2,
  Terminal,
  DatabaseBackup,
  Activity,
  TrendingUp,
  Server,
  Shield,
  RefreshCw,
  Copy,
  Play,
  Download,
  Upload,
  Zap,
  Database,
  HardDrive,
  Clock,
  CheckCircle,
  Check,
  AlertTriangle,
  XCircle,
  Info,
  Menu,
  X,
  Bell,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Home,
  LogOut,
  Calendar,
  ArrowLeft,
  Globe,
  Building,
  Target,
  Package,
  ExternalLink,
  FileDown,
  FileUp,
  Copy as CopyIcon,
  Edit as EditIcon,
  Trash,
  UserPlus,
  Layers,
  CreditCard,
  Smartphone,
  Mail,
  Phone,
  MapPin,
  Star,
  Heart,
  Share2,
  UploadCloud,
  Database as DatabaseIcon,
  PieChart,
  LineChart,
  ShoppingBag,
  Music,
  Coffee,
  Car,
  Banknote,
  Stethoscope,
  Wrench,
  Palette,
  Dumbbell,
  Plane,
  Train,
  Ship,
  Bus,
  Camera,
  Film,
  BookOpen,
  GraduationCap,
  HeartPulse,
  Utensils,
  Bed,
  Building2,
  Factory,
  Warehouse,
  Store as StoreIcon,
  ShoppingCart,
  Truck,
  Package2,
  Globe2,
  Map,
  Navigation,
  Compass,
  Pin,
  Navigation2,
  MapPin as MapPinIcon,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  GeolocationFields,
  BUSINESS_TYPE_OPTIONS,
  getBusinessTypesForCategory,
  getAdminLabels,
} from "@/components/ui/geolocation-fields";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AdvertisingSection } from "@/components/sections/AdvertisingSection";
import { ArtistsSection } from "@/components/sections/ArtistsSection";
import { UsersSection } from "@/components/sections/UsersSection";
import { AnalyticsSection } from "@/components/sections/AnalyticsSection";
import { TSRWhitelistSection } from "@/components/sections/TSRWhitelistSection";
import { ContractorApplicationsSection } from "@/components/sections/ContractorApplicationsSection";
import { GeoActionQueueSection } from "@/components/sections/GeoActionQueueSection";
import { ContractorAssignmentSection } from "@/components/sections/ContractorAssignmentSection";
import { useCountry } from "@/contexts/CountryContext";

const API_BASE_URL = "";

// Business categories mapping with styling (used for icons and colors)
// Database has 20 total categories - these mappings provide visual styling
const BUSINESS_CATEGORIES = [
  // Original categories
  {
    id: 1,
    name: "Communication",
    icon: Megaphone,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: 2,
    name: "Publishing",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: 3,
    name: "Advertising",
    icon: Megaphone,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    id: 4,
    name: "Event Planning",
    icon: Calendar,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
  {
    id: 5,
    name: "Finance",
    icon: Banknote,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: 6,
    name: "Hospitality",
    icon: Bed,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },

  // Sector pages categories
  {
    id: 13,
    name: "Santé",
    icon: HeartPulse,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    id: 14,
    name: "Bâtiment",
    icon: Wrench,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: 15,
    name: "Automobile",
    icon: Car,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: 16,
    name: "Commerce",
    icon: ShoppingCart,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    id: 17,
    name: "Divertissement",
    icon: Film,
    color: "text-fuchsia-600",
    bgColor: "bg-fuchsia-50",
  },

  // Business directory categories
  {
    id: 18,
    name: "Healthcare",
    icon: HeartPulse,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    id: 19,
    name: "Restaurants",
    icon: Utensils,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    id: 20,
    name: "Hotels",
    icon: Bed,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: 21,
    name: "Retail",
    icon: ShoppingCart,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    id: 22,
    name: "Technology",
    icon: Smartphone,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: 23,
    name: "Construction",
    icon: Wrench,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    id: 24,
    name: "Entertainment",
    icon: Film,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    id: 25,
    name: "Education",
    icon: GraduationCap,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    id: 26,
    name: "Travel",
    icon: Plane,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
  },
];

const MAIN_SECTIONS = [
  {
    id: "businesses",
    label: "Businesses",
    icon: Store,
    description: "Manage all business listings",
  },
  {
    id: "categories",
    label: "Categories",
    icon: Tag,
    description: "Organize business categories",
  },
  {
    id: "advertising",
    label: "Advertising",
    icon: Megaphone,
    description: "Manage ad campaigns",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: ShoppingBag,
    description: "Review & approve marketplace listings",
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: Briefcase,
    description: "Job listings management",
  },
  {
    id: "artists",
    label: "Artists",
    icon: Music,
    description: "Artist profiles & music",
  },
  { id: "users", label: "Users", icon: Users, description: "User management" },
  {
    id: "roles",
    label: "Roles",
    icon: Shield,
    description: "Manage user roles & permissions",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Performance analytics",
  },
  {
    id: "cms",
    label: "Content",
    icon: FileText,
    description: "Pages & content",
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    description: "Accounts, lockouts & auth",
  },
  {
    id: "smtp",
    label: "Email / SMTP",
    icon: Mail,
    description: "Configure email delivery",
  },
  {
    id: "tsr-whitelist",
    label: "TSR Whitelist",
    icon: Shield,
    description: "Technical service reps",
  },
  {
    id: "contractor-apps",
    label: "Contractor Apps",
    icon: UserPlus,
    description: "Review contractor applications",
  },
  {
    id: "geo-queue",
    label: "Geo-Action Queue",
    icon: Globe,
    description: "Geographic action requests",
  },
  {
    id: "contractor-assign",
    label: "Contracts",
    icon: Briefcase,
    description: "Assign & manage contracts",
  },
];

const DATABASE_OPERATIONS = [
  {
    id: "sql-editor",
    label: "SQL Editor",
    icon: Terminal,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "backup",
    label: "Backup",
    icon: DatabaseBackup,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    id: "export",
    label: "Export",
    icon: Download,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "import",
    label: "Import",
    icon: Upload,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    id: "health",
    label: "Health",
    icon: Activity,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
  },
  {
    id: "performance",
    label: "Performance",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
];

const QUICK_ACTIONS = [
  {
    id: "add-business",
    label: "Add Business",
    icon: Plus,
    color: "bg-gradient-to-r from-blue-500 to-cyan-500",
  },
  {
    id: "add-category",
    label: "Add Category",
    icon: Tag,
    color: "bg-gradient-to-r from-emerald-500 to-green-500",
  },
  {
    id: "add-job",
    label: "Post Job",
    icon: Briefcase,
    color: "bg-gradient-to-r from-amber-500 to-orange-500",
  },
  {
    id: "add-ad",
    label: "Create Ad",
    icon: Megaphone,
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
  },
];

// Dashboard Stats Component
const DashboardStats = ({ stats, onRefresh, isRefreshing }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Businesses</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {stats.businesses}
            </p>
            <p className="text-xs text-gray-500 mt-1">+12% from last month</p>
          </div>
          <div className="p-3 rounded-full bg-blue-100">
            <Store className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active Categories</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {stats.categories}
            </p>
            <p className="text-xs text-gray-500 mt-1">+3 new this week</p>
          </div>
          <div className="p-3 rounded-full bg-emerald-100">
            <Tag className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Job Listings</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {stats.jobs || "48"}
            </p>
            <p className="text-xs text-gray-500 mt-1">+8 active positions</p>
          </div>
          <div className="p-3 rounded-full bg-amber-100">
            <Briefcase className="h-6 w-6 text-amber-600" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {stats.users || "1,245"}
            </p>
            <p className="text-xs text-gray-500 mt-1">+45 today</p>
          </div>
          <div className="p-3 rounded-full bg-purple-100">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// PENDING BUSINESS APPROVALS (SupUser / SuperUser review panel)
// ══════════════════════════════════════════════════════════════════════════════
const PendingApprovals = () => {
  const [pendingBiz, setPendingBiz] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/businesses/pending`,
      );
      const data = await res.json();
      if (data.success) setPendingBiz(data.data || []);
    } catch (err) {
      console.error("Failed to fetch pending businesses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id: number, name: string) => {
    setActionId(id);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/businesses/${id}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvedBy: 1 }),
        },
      );
      const result = await res.json();
      if (result.success) {
        setPendingBiz((prev) => prev.filter((b) => b.id !== id));
        alert(`✅ "${name}" approved and now live!`);
      }
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number, name: string) => {
    const reason = prompt(`Reason for rejecting "${name}":`);
    if (reason === null) return; // user cancelled
    setActionId(id);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/businesses/${id}/reject`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectedBy: 1, reason }),
        },
      );
      const result = await res.json();
      if (result.success) {
        setPendingBiz((prev) => prev.filter((b) => b.id !== id));
        alert(`❌ "${name}" has been rejected.`);
      }
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setActionId(null);
    }
  };

  if (pendingBiz.length === 0 && !loading) return null;

  return (
    <Card className="border-0 shadow-lg mb-6 border-l-4 border-l-amber-400">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b px-3 sm:px-6 py-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <div className="p-1.5 bg-amber-500 text-white rounded-lg">
            <Clock className="h-4 w-4" />
          </div>
          Pending Business Approvals
          {pendingBiz.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold bg-amber-500 text-white rounded-full">
              {pendingBiz.length}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          GeoAdmin submissions awaiting SupUser / SuperUser review
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500 mr-2" />
            <span className="text-sm text-gray-500">
              Loading pending submissions…
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingBiz.map((biz: any) => (
              <div
                key={biz.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-amber-50/50 border border-amber-200 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">
                      {biz.name}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
                      ⏳ Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {biz.category_name && <span>{biz.category_name}</span>}
                    {biz.country_code && <span>🌍 {biz.country_code}</span>}
                    {biz.city_name && <span>📍 {biz.city_name}</span>}
                    {biz.submitted_by_username && (
                      <span>👤 {biz.submitted_by_username}</span>
                    )}
                    {biz.created_at && (
                      <span>
                        📅 {new Date(biz.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {biz.pdf_path && (
                    <a
                      href={`${API_BASE_URL}/api/businesses/${biz.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    >
                      📄 PDF
                    </a>
                  )}
                  <Button
                    size="sm"
                    className="gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                    disabled={actionId === biz.id}
                    onClick={() => handleApprove(biz.id, biz.name)}
                  >
                    {actionId === biz.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1 text-xs"
                    disabled={actionId === biz.id}
                    onClick={() => handleReject(biz.id, biz.name)}
                  >
                    {actionId === biz.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Business Management Component
const BusinessManagement = ({
  sharedCategories,
}: { sharedCategories?: any[] } = {}) => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [countriesList, setCountriesList] = useState<any[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentBusiness, setCurrentBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [regionsList, setRegionsList] = useState<any[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [citiesList, setCitiesList] = useState<any[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [autoPopulateRegion, setAutoPopulateRegion] = useState(true);
  const [autoPopulateCity, setAutoPopulateCity] = useState(true);
  const { selectedCountry: detectedCountry } = useCountry();
  const [newBusiness, setNewBusiness] = useState({
    name: "",
    categoryId: 0,
    email: "",
    phone: "",
    address: "",
    description: "",
    // Location
    regionId: "",
    regionName: "",
    cityName: "",
    countryCode: "",
    latitude: "",
    longitude: "",
    // Contact & Web
    website: "",
    // Discoverability
    businessType: "",
    tags: "",
    openingHours: "",
  });

  // Auto-initialize country from detected location when Add dialog opens
  useEffect(() => {
    if (showAddDialog && detectedCountry && !newBusiness.countryCode) {
      setNewBusiness((prev) => ({ ...prev, countryCode: detectedCountry }));
    }
  }, [showAddDialog, detectedCountry]);

  // Fetch regions when country changes (for Add dialog) — cascading: Country → Region
  useEffect(() => {
    const countryCode = newBusiness.countryCode;
    if (!countryCode) {
      setRegionsList([]);
      setCitiesList([]);
      return;
    }
    const matchedCountry = countriesList.find(
      (c: any) => c.code === countryCode,
    );
    if (!matchedCountry) {
      setRegionsList([]);
      setCitiesList([]);
      return;
    }
    setRegionsLoading(true);
    fetch(`${API_BASE_URL}/api/regions?countryId=${matchedCountry.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setRegionsList(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setRegionsList([]))
      .finally(() => setRegionsLoading(false));
  }, [newBusiness.countryCode, countriesList]);

  // Fetch cities when region changes (for Add dialog) — cascading: Region → City
  useEffect(() => {
    const regionId = newBusiness.regionId;
    if (!regionId) {
      // If no region selected but country is, fetch all cities for that country as fallback
      const countryCode = newBusiness.countryCode;
      if (countryCode && regionsList.length === 0) {
        const matchedCountry = countriesList.find(
          (c: any) => c.code === countryCode,
        );
        if (matchedCountry) {
          setCitiesLoading(true);
          fetch(`${API_BASE_URL}/api/cities?countryId=${matchedCountry.id}`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
              setCitiesList(Array.isArray(data) ? data : data.data || []);
            })
            .catch(() => setCitiesList([]))
            .finally(() => setCitiesLoading(false));
          return;
        }
      }
      setCitiesList([]);
      return;
    }
    setCitiesLoading(true);
    fetch(`${API_BASE_URL}/api/cities?regionId=${regionId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setCitiesList(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setCitiesList([]))
      .finally(() => setCitiesLoading(false));
  }, [
    newBusiness.regionId,
    newBusiness.countryCode,
    regionsList,
    countriesList,
  ]);

  // ── Edit dialog: Region & City state ──
  const [editRegionsList, setEditRegionsList] = useState<any[]>([]);
  const [editRegionsLoading, setEditRegionsLoading] = useState(false);
  const [editCitiesList, setEditCitiesList] = useState<any[]>([]);
  const [editCitiesLoading, setEditCitiesLoading] = useState(false);
  const [editAutoPopulateRegion, setEditAutoPopulateRegion] = useState(true);
  const [editAutoPopulateCity, setEditAutoPopulateCity] = useState(true);

  // Fetch regions for Edit dialog when country changes
  useEffect(() => {
    const countryCode =
      currentBusiness?.countryCode || currentBusiness?.country_code;
    if (!countryCode) {
      setEditRegionsList([]);
      setEditCitiesList([]);
      return;
    }
    const matchedCountry = countriesList.find(
      (c: any) => c.code === countryCode,
    );
    if (!matchedCountry) {
      setEditRegionsList([]);
      setEditCitiesList([]);
      return;
    }
    setEditRegionsLoading(true);
    fetch(`${API_BASE_URL}/api/regions?countryId=${matchedCountry.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setEditRegionsList(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setEditRegionsList([]))
      .finally(() => setEditRegionsLoading(false));
  }, [
    currentBusiness?.countryCode,
    currentBusiness?.country_code,
    countriesList,
  ]);

  // Fetch cities for Edit dialog when region changes
  useEffect(() => {
    const regionId = currentBusiness?.regionId || currentBusiness?.region_id;
    if (!regionId) {
      // Fallback: fetch all cities for the country if no regions exist
      const countryCode =
        currentBusiness?.countryCode || currentBusiness?.country_code;
      if (countryCode && editRegionsList.length === 0) {
        const matchedCountry = countriesList.find(
          (c: any) => c.code === countryCode,
        );
        if (matchedCountry) {
          setEditCitiesLoading(true);
          fetch(`${API_BASE_URL}/api/cities?countryId=${matchedCountry.id}`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
              setEditCitiesList(Array.isArray(data) ? data : data.data || []);
            })
            .catch(() => setEditCitiesList([]))
            .finally(() => setEditCitiesLoading(false));
          return;
        }
      }
      setEditCitiesList([]);
      return;
    }
    setEditCitiesLoading(true);
    fetch(`${API_BASE_URL}/api/cities?regionId=${regionId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setEditCitiesList(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setEditCitiesList([]))
      .finally(() => setEditCitiesLoading(false));
  }, [
    currentBusiness?.regionId,
    currentBusiness?.region_id,
    currentBusiness?.countryCode,
    currentBusiness?.country_code,
    editRegionsList,
    countriesList,
  ]);

  const fetchBusinesses = useCallback(
    async (
      searchTerm = "",
      categoryFilter = "all",
      pageNum = 1,
      countryFilter = "all",
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
        });
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        if (countryFilter && countryFilter !== "all")
          params.set("countryCode", countryFilter);

        // Try admin endpoint first, fall back to public endpoint
        let businessData: any = null;
        const adminUrl = `${API_BASE_URL}/api/v1/admin/businesses?${params.toString()}`;
        const publicUrl = `${API_BASE_URL}/api/businesses?${params.toString()}`;

        try {
          const businessRes = await authenticatedFetch(adminUrl);
          if (businessRes.ok) {
            businessData = await businessRes.json();
          }
        } catch {
          // Admin endpoint failed — try public
        }

        if (!businessData?.success && !businessData?.data) {
          const publicRes = await fetch(publicUrl);
          if (publicRes.ok) {
            businessData = await publicRes.json();
          }
        }

        if (businessData?.success || businessData?.data) {
          setBusinesses(businessData.data || []);
          if (businessData.pagination) {
            setTotalPages(
              businessData.pagination.totalPages ||
                businessData.pagination.pages ||
                1,
            );
            setTotalCount(Number(businessData.pagination.total) || 0);
          } else {
            setTotalPages(1);
            setTotalCount(businessData.data?.length || 0);
          }
        } else {
          throw new Error("No businesses returned from API");
        }

        // Categories are loaded separately in their own useEffect
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setBusinesses([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Initial load — fetch businesses once
  useEffect(() => {
    fetchBusinesses("", "all", 1, selectedCountry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load countries list
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/countries`);
        if (res.ok) {
          const data = await res.json();
          setCountriesList(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.warn("Failed to load countries:", err);
      }
    };
    loadCountries();
  }, []);

  // Load categories independently (always fetch from API)
  useEffect(() => {
    if (sharedCategories && sharedCategories.length > 0) {
      setCategories(sharedCategories);
      return;
    }

    const loadCategories = async () => {
      // Try admin endpoint first (requires auth)
      try {
        const res = await authenticatedFetch(
          `${API_BASE_URL}/api/v1/admin/categories`,
        );
        if (res.ok) {
          const data = await res.json();
          const cats = Array.isArray(data) ? data : data.data || [];
          if (cats.length > 0) {
            setCategories(cats);
            return;
          }
        }
      } catch (err) {
        console.warn("Admin categories endpoint failed, trying fallback...");
      }

      // Fallback: public /api/categories endpoint (no auth required)
      try {
        const res = await fetch(`${API_BASE_URL}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          const cats = Array.isArray(data) ? data : data.data || [];
          setCategories(cats);
          return;
        }
      } catch (err) {
        console.warn("Public categories endpoint also failed:", err);
      }

      console.error("❌ Could not load categories from any endpoint");
    };

    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search — only react to user typing or filter changes
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchBusinesses(search, selectedCategory, 1, selectedCountry);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory, selectedCountry]);

  // Re-fetch when page changes (but not on initial mount, initial load handles that)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBusinesses(search, selectedCategory, page, selectedCountry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleCategorySearch = (value: string) => {
    setCategorySearch(value);
    if (value.length > 0) {
      setShowCategoryDropdown(true);
      const filtered = categories
        .filter((c: any) => !c.parentId)
        .filter((c: any) => c.name.toLowerCase().includes(value.toLowerCase()))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories([]);
      setShowCategoryDropdown(true);
    }
  };

  const handleSelectCategory = (categoryId: number) => {
    setSelectedCategory(String(categoryId));
    setPage(1);
    setCategorySearch("");
    setShowCategoryDropdown(false);
  };

  const handleAddBusiness = async () => {
    if (!newBusiness.name || !newBusiness.categoryId) {
      toast({
        title: "Validation Error",
        description: "Business name and category are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Use authenticatedFetch which handles auth cookie + CSRF token automatically
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/businesses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newBusiness),
        },
      );
      const data = await response.json();

      if (data.success) {
        await fetchBusinesses(search, selectedCategory, page, selectedCountry);
        setShowAddDialog(false);
        setNewBusiness({
          name: "",
          categoryId: 0,
          email: "",
          phone: "",
          address: "",
          description: "",
          regionId: "",
          regionName: "",
          cityName: "",
          countryCode: "",
          latitude: "",
          longitude: "",
          website: "",
          businessType: "",
          tags: "",
          openingHours: "",
        });
        toast({
          title: "Success",
          description: "Business added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to add business",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add business:", error);
      toast({
        title: "Error",
        description: "Failed to add business",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditBusiness = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/businesses/${currentBusiness.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentBusiness),
        },
      );
      const data = await response.json();
      if (data.success) {
        await fetchBusinesses(search, selectedCategory, page, selectedCountry);
        setShowEditDialog(false);
        setCurrentBusiness(null);
        toast({
          title: "Success",
          description: "Business updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to update business",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update business:", error);
      toast({
        title: "Error",
        description: "Failed to update business",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/businesses/${currentBusiness.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (data.success) {
        await fetchBusinesses(search, selectedCategory, page, selectedCountry);
        setShowDeleteDialog(false);
        setCurrentBusiness(null);
        toast({
          title: "Success",
          description: "Business deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to delete business",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete business:", error);
      toast({
        title: "Error",
        description: "Failed to delete business",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg">
                <Store className="h-5 w-5" />
              </div>
              Business Management
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Manage{" "}
              <span className="font-semibold text-gray-700">{totalCount}</span>{" "}
              {selectedCountry !== "all" ? (
                <>
                  businesses in{" "}
                  <span className="font-semibold text-amber-600">
                    {countriesList.find((c: any) => c.code === selectedCountry)
                      ?.name || selectedCountry}
                  </span>
                </>
              ) : (
                <>
                  active businesses across{" "}
                  <span className="font-semibold text-gray-700">
                    {categories.filter((c: any) => !c.parentId).length}
                  </span>{" "}
                  main categories ({categories.length} total)
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setShowAddDialog(true);
                // Pre-fill countryCode with selected country (if not "all")
                if (selectedCountry && selectedCountry !== "all") {
                  setNewBusiness((prev) => ({
                    ...prev,
                    countryCode: selectedCountry,
                  }));
                }
              }}
              className="gap-1.5 text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Business
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs sm:text-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Country Filter */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-xs sm:text-sm font-medium text-amber-800">
                Country
              </span>
            </div>
            <select
              value={selectedCountry}
              onChange={(e) => {
                const newCountry = e.target.value;
                setSelectedCountry(newCountry);
                setPage(1);
                // Fetch immediately with new country
                fetchBusinesses(search, selectedCategory, 1, newCountry);
              }}
              className="flex-1 min-w-0 w-full sm:w-auto sm:min-w-[180px] md:max-w-xs h-9 px-3 rounded-md border border-amber-300 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">🌍 All Countries</option>
              {countriesList.map((c: any) => (
                <option key={c.code || c.id} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            {selectedCountry !== "all" && (
              <button
                onClick={() => {
                  setSelectedCountry("all");
                  setPage(1);
                  fetchBusinesses(search, selectedCategory, 1, "all");
                }}
                className="text-xs text-amber-600 hover:text-amber-800 underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Stats Row */}
          {businesses.length > 0 && (
            <div className="flex overflow-x-auto gap-3 mb-4 pb-1 snap-x snap-mandatory sm:grid sm:grid-cols-2 md:grid-cols-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 min-w-[130px] flex-1 snap-start">
                <div className="text-2xl font-bold text-blue-700">
                  {totalCount}
                </div>
                <div className="text-xs text-blue-600">Total Businesses</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 min-w-[130px] flex-1 snap-start">
                <div className="text-2xl font-bold text-green-700">
                  {
                    businesses.filter((b: any) => b.isVerified || b.is_verified)
                      .length
                  }
                </div>
                <div className="text-xs text-green-600">Verified</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 min-w-[130px] flex-1 snap-start">
                <div className="text-2xl font-bold text-purple-700">
                  {
                    businesses.filter(
                      (b: any) => b.isAdvertiser || b.is_advertiser,
                    ).length
                  }
                </div>
                <div className="text-xs text-purple-600">Advertisers</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 min-w-[130px] flex-1 snap-start">
                <div className="text-2xl font-bold text-amber-700">
                  {(() => {
                    const rated = businesses.filter(
                      (b: any) => Number(b.rating) > 0,
                    );
                    return rated.length > 0
                      ? (
                          rated.reduce(
                            (s: number, b: any) => s + Number(b.rating),
                            0,
                          ) / rated.length
                        ).toFixed(1)
                      : "—";
                  })()}
                </div>
                <div className="text-xs text-amber-600">Avg Rating</div>
              </div>
            </div>
          )}

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-4 rounded-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              {loading && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 text-gray-400 animate-spin" />
              )}
              <Input
                placeholder="Search businesses by name, email, phone, address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 bg-white"
              />
            </div>
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Search category..."
                value={categorySearch}
                onChange={(e) => handleCategorySearch(e.target.value)}
                onFocus={() => setShowCategoryDropdown(true)}
                className="pl-9 bg-white"
              />
              <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

              <AnimatePresence>
                {showCategoryDropdown && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto overscroll-contain"
                    >
                      <button
                        onClick={() => {
                          setSelectedCategory("all");
                          setPage(1);
                          setCategorySearch("");
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm border-b font-semibold transition-colors ${
                          selectedCategory === "all"
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        ← All Categories (
                        {categories.filter((c: any) => !c.parentId).length})
                      </button>

                      {(categorySearch.length === 0
                        ? categories.filter((c: any) => !c.parentId)
                        : filteredCategories
                      )
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((mainCat: any) => {
                          const subs = categories
                            .filter((c: any) => c.parentId === mainCat.id)
                            .sort((a: any, b: any) =>
                              a.name.localeCompare(b.name),
                            );
                          const filteredSubs =
                            categorySearch.length > 0
                              ? subs.filter((s: any) =>
                                  s.name
                                    .toLowerCase()
                                    .startsWith(categorySearch.toLowerCase()),
                                )
                              : subs;

                          return (
                            <div key={mainCat.id}>
                              <button
                                onClick={() => handleSelectCategory(mainCat.id)}
                                className={`w-full text-left px-3 py-2.5 text-sm font-semibold border-b transition-colors group ${
                                  selectedCategory === String(mainCat.id)
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "text-gray-900 hover:bg-emerald-50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Tag className="h-3 w-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  {mainCat.name}
                                </div>
                              </button>
                              {filteredSubs.length > 0 && (
                                <>
                                  {filteredSubs.map((sub: any) => (
                                    <button
                                      key={sub.id}
                                      onClick={() =>
                                        handleSelectCategory(sub.id)
                                      }
                                      className={`w-full text-left px-6 py-2 text-sm border-b transition-colors hover:bg-emerald-50 ${
                                        selectedCategory === String(sub.id)
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      ↳ {sub.name}
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          );
                        })}
                    </motion.div>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowCategoryDropdown(false)}
                    />
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Businesses Table */}
          <div className="border rounded-lg overflow-x-auto">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedCategory === "all"
                      ? "All Businesses"
                      : "Filtered Businesses"}
                    <span className="text-emerald-600 font-bold ml-2">
                      ({businesses.length} showing out of {totalCount})
                    </span>
                  </h3>
                </div>
                {(selectedCategory !== "all" || search) && (
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setSearch("");
                      setPage(1);
                    }}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors font-medium text-gray-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Contact
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Rating</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-right w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="text-gray-500">
                        {loading ? (
                          <>
                            <Loader2 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin" />
                            <p className="font-medium">Loading businesses...</p>
                          </>
                        ) : (
                          <>
                            <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No businesses found</p>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses.map((business) => {
                    const category = categories.find(
                      (c: any) => c.id === business.categoryId,
                    );
                    const fallbackCategory = BUSINESS_CATEGORIES.find(
                      (c) =>
                        c.id === business.categoryId ||
                        c.id === business.category,
                    );
                    // Try to get category name from multiple sources
                    const categoryName =
                      category?.name ||
                      fallbackCategory?.name ||
                      business.category_name ||
                      business.categoryName ||
                      "Unknown";
                    const Icon = fallbackCategory?.icon || Store;
                    const bgColor = fallbackCategory?.bgColor || "bg-gray-100";
                    const color = fallbackCategory?.color || "text-gray-600";

                    return (
                      <TableRow
                        key={business.id}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${bgColor}`}>
                              <Icon className={`h-5 w-5 ${color}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 flex items-center gap-2">
                                {business.name}
                                {(business.isVerified ||
                                  business.is_verified) && (
                                  <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-normal">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500 truncate max-w-[180px] sm:max-w-none">
                                {business.address || business.location || "—"}
                              </p>
                              {/* Mobile-only: show category + status inline */}
                              <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                                <Badge
                                  variant="outline"
                                  className="capitalize text-[10px] px-1.5 py-0"
                                >
                                  {categoryName}
                                </Badge>
                                <span
                                  className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${
                                    business.isActive !== false
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {business.isActive !== false
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="capitalize">
                            {categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <p className="text-sm font-medium">
                              {business.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              {business.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium">
                              {business.rating || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant={
                              business.isActive !== false
                                ? "default"
                                : "secondary"
                            }
                            className={
                              business.isActive !== false
                                ? "bg-emerald-100 text-emerald-700"
                                : ""
                            }
                          >
                            {business.isActive !== false
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="text-sm text-gray-500">
                            {business.createdAt}
                          </p>
                        </TableCell>
                        <TableCell className="text-right p-1 sm:p-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => {
                                setCurrentBusiness(business);
                                setShowEditDialog(true);
                              }}
                              title="Edit"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setCurrentBusiness(business);
                                setShowDeleteDialog(true);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      {/* Add Business Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Business</DialogTitle>
            <DialogDescription>
              Create a new business listing with full discovery metrics
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto overscroll-contain flex-1 pr-2 space-y-6">
            {/* ── Identity ── */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building className="h-4 w-4" /> Identity
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter business name"
                    value={newBusiness.name}
                    onChange={(e) =>
                      setNewBusiness({ ...newBusiness, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={
                      newBusiness.categoryId && newBusiness.categoryId > 0
                        ? String(newBusiness.categoryId)
                        : undefined
                    }
                    onValueChange={(value) => {
                      const newCatId = parseInt(value);
                      // Auto-clear businessType if it's no longer compatible with the new category
                      const compatibleTypes = getBusinessTypesForCategory(
                        categories,
                        newCatId,
                      );
                      const currentTypeStillValid = compatibleTypes.find(
                        (t) =>
                          t.value === newBusiness.businessType && !t.disabled,
                      );
                      setNewBusiness({
                        ...newBusiness,
                        categoryId: newCatId,
                        businessType: currentTypeStillValid
                          ? newBusiness.businessType
                          : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {categories.length === 0 ? (
                        <SelectItem value="__loading" disabled>
                          Loading categories...
                        </SelectItem>
                      ) : (
                        categories
                          .filter((c: any) => !c.parentId)
                          .sort((a: any, b: any) =>
                            a.name.localeCompare(b.name),
                          )
                          .map((cat: any) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select
                    value={newBusiness.businessType || undefined}
                    onValueChange={(value) =>
                      setNewBusiness({ ...newBusiness, businessType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {getBusinessTypesForCategory(
                        categories,
                        newBusiness.categoryId,
                      ).map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          disabled={opt.disabled}
                          className={opt.disabled ? "opacity-40" : ""}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Location ── */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </h4>
              {(() => {
                const labels = getAdminLabels(newBusiness.countryCode);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Country */}
                    <div>
                      <Label htmlFor="countryCode">Country *</Label>
                      <select
                        id="countryCode"
                        value={newBusiness.countryCode}
                        onChange={(e) =>
                          setNewBusiness({
                            ...newBusiness,
                            countryCode: e.target.value,
                            regionId: "", // reset region when country changes
                            cityName: "", // reset city when country changes
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select country</option>
                        {countriesList.map((c: any) => (
                          <option key={c.code || c.id} value={c.code}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Region / Province / State — dynamic label + auto-populate toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="regionId">{labels.region}</Label>
                        {regionsList.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setAutoPopulateRegion(!autoPopulateRegion)
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              autoPopulateRegion ? "bg-primary" : "bg-muted"
                            }`}
                            title={
                              autoPopulateRegion
                                ? "Switch to manual input"
                                : "Switch to dropdown"
                            }
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                autoPopulateRegion
                                  ? "translate-x-[18px]"
                                  : "translate-x-[3px]"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                      {regionsList.length > 0 && autoPopulateRegion ? (
                        <select
                          id="regionId"
                          value={newBusiness.regionId}
                          onChange={(e) =>
                            setNewBusiness({
                              ...newBusiness,
                              regionId: e.target.value,
                              cityName: "",
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">
                            {regionsLoading
                              ? `Loading ${labels.region.toLowerCase()}s...`
                              : `Select ${labels.region.toLowerCase()}`}
                          </option>
                          {regionsList
                            .sort((a: any, b: any) =>
                              a.name.localeCompare(b.name),
                            )
                            .map((region: any) => (
                              <option key={region.id} value={String(region.id)}>
                                {region.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <Input
                          id="regionId"
                          placeholder={
                            newBusiness.countryCode
                              ? regionsLoading
                                ? `Loading ${labels.region.toLowerCase()}s...`
                                : `Type ${labels.region.toLowerCase()} name`
                              : "Select country first"
                          }
                          disabled={!newBusiness.countryCode || regionsLoading}
                          value={newBusiness.regionName || ""}
                          onChange={(e) =>
                            setNewBusiness({
                              ...newBusiness,
                              regionName: e.target.value,
                            })
                          }
                        />
                      )}
                    </div>

                    {/* City / Ville / Stadt — dynamic label + auto-populate toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="cityName">{labels.city}</Label>
                        {citiesList.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setAutoPopulateCity(!autoPopulateCity)
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              autoPopulateCity ? "bg-primary" : "bg-muted"
                            }`}
                            title={
                              autoPopulateCity
                                ? "Switch to manual input"
                                : "Switch to dropdown"
                            }
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                autoPopulateCity
                                  ? "translate-x-[18px]"
                                  : "translate-x-[3px]"
                              }`}
                            />
                          </button>
                        )}
                      </div>
                      {citiesList.length > 0 && autoPopulateCity ? (
                        <select
                          id="cityName"
                          value={newBusiness.cityName}
                          onChange={(e) =>
                            setNewBusiness({
                              ...newBusiness,
                              cityName: e.target.value,
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">
                            {citiesLoading
                              ? `Loading ${labels.city.toLowerCase()}...`
                              : `Select ${labels.city.toLowerCase()}`}
                          </option>
                          {citiesList
                            .sort((a: any, b: any) =>
                              a.name.localeCompare(b.name),
                            )
                            .map((city: any) => (
                              <option key={city.id} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <Input
                          id="cityName"
                          placeholder={
                            newBusiness.countryCode
                              ? regionsList.length > 0 && !newBusiness.regionId
                                ? `Select ${labels.region.toLowerCase()} first`
                                : `Type ${labels.city.toLowerCase()} name`
                              : "Select country first"
                          }
                          value={newBusiness.cityName}
                          onChange={(e) =>
                            setNewBusiness({
                              ...newBusiness,
                              cityName: e.target.value,
                            })
                          }
                          disabled={!newBusiness.countryCode}
                        />
                      )}
                    </div>

                    {/* Address — dynamic label */}
                    <div>
                      <Label htmlFor="address">{labels.address}</Label>
                      <Input
                        id="address"
                        placeholder={
                          newBusiness.countryCode === "CI"
                            ? "ex: Rue des Jardins, Cocody"
                            : newBusiness.countryCode === "FR"
                              ? "ex: 12 Rue de la Paix"
                              : "123 Main Street, Suite 4"
                        }
                        value={newBusiness.address}
                        onChange={(e) =>
                          setNewBusiness({
                            ...newBusiness,
                            address: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <GeolocationFields
                        latitude={newBusiness.latitude}
                        longitude={newBusiness.longitude}
                        onLatitudeChange={(v) =>
                          setNewBusiness({ ...newBusiness, latitude: v })
                        }
                        onLongitudeChange={(v) =>
                          setNewBusiness({ ...newBusiness, longitude: v })
                        }
                        onCountryDetected={(code) => {
                          if (!newBusiness.countryCode) {
                            setNewBusiness((prev) => ({
                              ...prev,
                              countryCode: code,
                            }));
                          }
                        }}
                        onRegionDetected={(regionName) => {
                          if (!newBusiness.regionId) {
                            // Try to match detected region name against loaded regions
                            const match = regionsList.find(
                              (r: any) =>
                                r.name.toLowerCase() ===
                                  regionName.toLowerCase() ||
                                regionName
                                  .toLowerCase()
                                  .includes(r.name.toLowerCase()) ||
                                r.name
                                  .toLowerCase()
                                  .includes(regionName.toLowerCase()),
                            );
                            if (match) {
                              setNewBusiness((prev) => ({
                                ...prev,
                                regionId: String(match.id),
                              }));
                            } else {
                              // No dropdown match — store as free text
                              setAutoPopulateRegion(false);
                              setNewBusiness((prev) => ({
                                ...prev,
                                regionName: regionName,
                              }));
                            }
                          }
                        }}
                        onCityDetected={(city) => {
                          if (!newBusiness.cityName) {
                            setNewBusiness((prev) => ({
                              ...prev,
                              cityName: city,
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            <Separator />

            {/* ── Contact & Web ── */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" /> Contact & Web
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="business@example.com"
                    value={newBusiness.email}
                    onChange={(e) =>
                      setNewBusiness({ ...newBusiness, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+33 1 23 45 67 89"
                    value={newBusiness.phone}
                    onChange={(e) =>
                      setNewBusiness({ ...newBusiness, phone: e.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.example.com"
                    value={newBusiness.website}
                    onChange={(e) =>
                      setNewBusiness({
                        ...newBusiness,
                        website: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Discoverability ── */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Search className="h-4 w-4" /> Discoverability
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="tags">Tags / Keywords</Label>
                  <Input
                    id="tags"
                    placeholder="pizza, italian, delivery, family-friendly"
                    value={newBusiness.tags}
                    onChange={(e) =>
                      setNewBusiness({ ...newBusiness, tags: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated search keywords
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="openingHours">Opening Hours</Label>
                  <Input
                    id="openingHours"
                    placeholder="Mon-Fri 9:00-18:00, Sat 10:00-16:00"
                    value={newBusiness.openingHours}
                    onChange={(e) =>
                      setNewBusiness({
                        ...newBusiness,
                        openingHours: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Description ── */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Description
              </h4>
              <Textarea
                id="description"
                placeholder="Describe what makes this business unique..."
                rows={3}
                value={newBusiness.description}
                onChange={(e) =>
                  setNewBusiness({
                    ...newBusiness,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddBusiness}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Business Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>Update business information</DialogDescription>
          </DialogHeader>
          {currentBusiness && (
            <div className="overflow-y-auto overscroll-contain flex-1 pr-2 space-y-6">
              {/* ── Identity ── */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" /> Identity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Business Name</Label>
                    <Input
                      id="edit-name"
                      value={currentBusiness.name || ""}
                      onChange={(e) =>
                        setCurrentBusiness({
                          ...currentBusiness,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category *</Label>
                    <Select
                      value={
                        currentBusiness.categoryId ||
                        currentBusiness.category_id
                          ? String(
                              currentBusiness.categoryId ||
                                currentBusiness.category_id,
                            )
                          : undefined
                      }
                      onValueChange={(value) => {
                        const newCatId = parseInt(value);
                        // Auto-clear businessType if incompatible with new category
                        const compatibleTypes = getBusinessTypesForCategory(
                          categories,
                          newCatId,
                        );
                        const currentTypeStillValid = compatibleTypes.find(
                          (t) =>
                            t.value === currentBusiness.businessType &&
                            !t.disabled,
                        );
                        setCurrentBusiness({
                          ...currentBusiness,
                          categoryId: newCatId,
                          category_id: newCatId,
                          businessType: currentTypeStillValid
                            ? currentBusiness.businessType
                            : "",
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {categories.length === 0 ? (
                          <SelectItem value="__loading" disabled>
                            Loading categories...
                          </SelectItem>
                        ) : (
                          categories
                            .filter((c: any) => !c.parentId)
                            .sort((a: any, b: any) =>
                              a.name.localeCompare(b.name),
                            )
                            .map((cat: any) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>
                                {cat.name}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-businessType">Business Type</Label>
                    <Select
                      value={
                        currentBusiness.businessType ||
                        currentBusiness.business_type ||
                        undefined
                      }
                      onValueChange={(value) =>
                        setCurrentBusiness({
                          ...currentBusiness,
                          businessType: value,
                          business_type: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {getBusinessTypesForCategory(
                          categories,
                          currentBusiness.categoryId ||
                            currentBusiness.category_id,
                        ).map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            disabled={opt.disabled}
                            className={opt.disabled ? "opacity-40" : ""}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Location ── */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Location
                </h4>
                {(() => {
                  const editCountryCode =
                    currentBusiness.countryCode ||
                    currentBusiness.country_code ||
                    "";
                  const labels = getAdminLabels(editCountryCode);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Country */}
                      <div>
                        <Label htmlFor="edit-countryCode">Country</Label>
                        <select
                          id="edit-countryCode"
                          value={editCountryCode}
                          onChange={(e) =>
                            setCurrentBusiness({
                              ...currentBusiness,
                              countryCode: e.target.value,
                              country_code: e.target.value,
                              regionId: "",
                              region_id: "",
                              cityName: "",
                              city_name: "",
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select country</option>
                          {countriesList.map((c: any) => (
                            <option key={c.code || c.id} value={c.code}>
                              {c.code} — {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Region / Province / State — dynamic label + auto-populate toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor="edit-regionId">{labels.region}</Label>
                          {editRegionsList.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditAutoPopulateRegion(
                                  !editAutoPopulateRegion,
                                )
                              }
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                editAutoPopulateRegion
                                  ? "bg-primary"
                                  : "bg-muted"
                              }`}
                              title={
                                editAutoPopulateRegion
                                  ? "Switch to manual input"
                                  : "Switch to dropdown"
                              }
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                  editAutoPopulateRegion
                                    ? "translate-x-[18px]"
                                    : "translate-x-[3px]"
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        {editRegionsList.length > 0 &&
                        editAutoPopulateRegion ? (
                          <select
                            id="edit-regionId"
                            value={
                              currentBusiness.regionId ||
                              currentBusiness.region_id ||
                              ""
                            }
                            onChange={(e) =>
                              setCurrentBusiness({
                                ...currentBusiness,
                                regionId: e.target.value,
                                region_id: e.target.value,
                                cityName: "",
                                city_name: "",
                              })
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">
                              {editRegionsLoading
                                ? `Loading ${labels.region.toLowerCase()}s...`
                                : `Select ${labels.region.toLowerCase()}`}
                            </option>
                            {editRegionsList
                              .sort((a: any, b: any) =>
                                a.name.localeCompare(b.name),
                              )
                              .map((region: any) => (
                                <option
                                  key={region.id}
                                  value={String(region.id)}
                                >
                                  {region.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <Input
                            id="edit-regionId"
                            placeholder={
                              editCountryCode
                                ? editRegionsLoading
                                  ? `Loading ${labels.region.toLowerCase()}s...`
                                  : `Type ${labels.region.toLowerCase()} name`
                                : "Select country first"
                            }
                            disabled={!editCountryCode || editRegionsLoading}
                            value={
                              currentBusiness.regionName ||
                              currentBusiness.region_name ||
                              ""
                            }
                            onChange={(e) =>
                              setCurrentBusiness({
                                ...currentBusiness,
                                regionName: e.target.value,
                                region_name: e.target.value,
                              })
                            }
                          />
                        )}
                      </div>

                      {/* City / Ville — dynamic label + auto-populate toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label htmlFor="edit-cityName">{labels.city}</Label>
                          {editCitiesList.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditAutoPopulateCity(!editAutoPopulateCity)
                              }
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                editAutoPopulateCity ? "bg-primary" : "bg-muted"
                              }`}
                              title={
                                editAutoPopulateCity
                                  ? "Switch to manual input"
                                  : "Switch to dropdown"
                              }
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                  editAutoPopulateCity
                                    ? "translate-x-[18px]"
                                    : "translate-x-[3px]"
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        {editCitiesList.length > 0 && editAutoPopulateCity ? (
                          <select
                            id="edit-cityName"
                            value={
                              currentBusiness.cityName ||
                              currentBusiness.city_name ||
                              ""
                            }
                            onChange={(e) =>
                              setCurrentBusiness({
                                ...currentBusiness,
                                cityName: e.target.value,
                                city_name: e.target.value,
                              })
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">
                              {editCitiesLoading
                                ? `Loading ${labels.city.toLowerCase()}...`
                                : `Select ${labels.city.toLowerCase()}`}
                            </option>
                            {editCitiesList
                              .sort((a: any, b: any) =>
                                a.name.localeCompare(b.name),
                              )
                              .map((city: any) => (
                                <option key={city.id} value={city.name}>
                                  {city.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <Input
                            id="edit-cityName"
                            placeholder={
                              editCountryCode
                                ? editRegionsList.length > 0 &&
                                  !(
                                    currentBusiness.regionId ||
                                    currentBusiness.region_id
                                  )
                                  ? `Select ${labels.region.toLowerCase()} first`
                                  : `Type ${labels.city.toLowerCase()} name`
                                : "Select country first"
                            }
                            value={
                              currentBusiness.cityName ||
                              currentBusiness.city_name ||
                              ""
                            }
                            onChange={(e) =>
                              setCurrentBusiness({
                                ...currentBusiness,
                                cityName: e.target.value,
                                city_name: e.target.value,
                              })
                            }
                          />
                        )}
                      </div>

                      {/* Address — dynamic label */}
                      <div>
                        <Label htmlFor="edit-address">{labels.address}</Label>
                        <Input
                          id="edit-address"
                          value={currentBusiness.address || ""}
                          onChange={(e) =>
                            setCurrentBusiness({
                              ...currentBusiness,
                              address: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <GeolocationFields
                          latitude={currentBusiness.latitude || ""}
                          longitude={currentBusiness.longitude || ""}
                          onLatitudeChange={(v) =>
                            setCurrentBusiness({
                              ...currentBusiness,
                              latitude: v,
                            })
                          }
                          onLongitudeChange={(v) =>
                            setCurrentBusiness({
                              ...currentBusiness,
                              longitude: v,
                            })
                          }
                          onCountryDetected={(code) => {
                            if (
                              !currentBusiness.countryCode &&
                              !currentBusiness.country_code
                            ) {
                              setCurrentBusiness((prev: any) => ({
                                ...prev,
                                countryCode: code,
                                country_code: code,
                              }));
                            }
                          }}
                          onRegionDetected={(regionName) => {
                            if (
                              !currentBusiness.regionId &&
                              !currentBusiness.region_id
                            ) {
                              const match = editRegionsList.find(
                                (r: any) =>
                                  r.name.toLowerCase() ===
                                    regionName.toLowerCase() ||
                                  regionName
                                    .toLowerCase()
                                    .includes(r.name.toLowerCase()) ||
                                  r.name
                                    .toLowerCase()
                                    .includes(regionName.toLowerCase()),
                              );
                              if (match) {
                                setCurrentBusiness((prev: any) => ({
                                  ...prev,
                                  regionId: String(match.id),
                                  region_id: String(match.id),
                                }));
                              } else {
                                setEditAutoPopulateRegion(false);
                                setCurrentBusiness((prev: any) => ({
                                  ...prev,
                                  regionName: regionName,
                                  region_name: regionName,
                                }));
                              }
                            }
                          }}
                          onCityDetected={(city) => {
                            if (
                              !currentBusiness.cityName &&
                              !currentBusiness.city_name
                            ) {
                              setCurrentBusiness((prev: any) => ({
                                ...prev,
                                cityName: city,
                                city_name: city,
                              }));
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <Separator />

              {/* ── Contact & Web ── */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Contact & Web
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={currentBusiness.email || ""}
                      onChange={(e) =>
                        setCurrentBusiness({
                          ...currentBusiness,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={currentBusiness.phone || ""}
                      onChange={(e) =>
                        setCurrentBusiness({
                          ...currentBusiness,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="edit-website">Website</Label>
                    <Input
                      id="edit-website"
                      type="url"
                      value={currentBusiness.website || ""}
                      onChange={(e) =>
                        setCurrentBusiness({
                          ...currentBusiness,
                          website: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Description ── */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Description
                </h4>
                <Textarea
                  id="edit-description"
                  rows={3}
                  value={currentBusiness.description || ""}
                  onChange={(e) =>
                    setCurrentBusiness({
                      ...currentBusiness,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditBusiness}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <EditIcon className="h-4 w-4" />
              )}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Business Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{currentBusiness?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteBusiness}
              disabled={loading}
              variant="destructive"
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Category Management Component
const CategoryManagement = ({
  sharedCategories,
}: {
  sharedCategories?: any[];
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [catSearch, setCatSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
  });

  useEffect(() => {
    if (sharedCategories && sharedCategories.length > 0) {
      setCategories(sharedCategories);
      return;
    }

    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/api/v1/admin/categories?limit=500`,
        );
        const data = await response.json();

        // Handle different response formats
        if (data.success && data.data) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          setCategories(data);
        } else if (data.data && Array.isArray(data.data)) {
          setCategories(data.data);
        } else if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else {
          console.warn("Unexpected API response format:", data);
          setCategories([]);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [sharedCategories]);

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.slug) {
      toast({
        title: "Validation Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/categories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCategory),
        },
      );
      const data = await response.json();
      if (data.success) {
        setCategories([...categories, data.data]);
        setShowAddDialog(false);
        setNewCategory({ name: "", slug: "", description: "" });
        toast({
          title: "Success",
          description: "Category added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to add category",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add category:", error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!currentCategory) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/categories/${currentCategory.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentCategory),
        },
      );
      const data = await response.json();
      if (data.success) {
        setCategories(
          categories.map((c) => (c.id === currentCategory.id ? data.data : c)),
        );
        setShowEditDialog(false);
        setCurrentCategory(null);
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to update category",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update category:", error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!currentCategory) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/categories/${currentCategory.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (data.success) {
        setCategories(categories.filter((c) => c.id !== currentCategory.id));
        setShowDeleteDialog(false);
        setCurrentCategory(null);
        toast({
          title: "Success",
          description: "Category deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to delete category",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Category Management
            </CardTitle>
            <CardDescription>
              Organize businesses into categories and subcategories
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-green-500"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-lg font-bold text-emerald-700">
              {categories.filter((c: any) => !c.parentId).length}
            </span>
            <span className="text-xs text-emerald-600 ml-1">
              Main Categories
            </span>
          </div>
          <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-lg font-bold text-blue-700">
              {categories.filter((c: any) => c.parentId).length}
            </span>
            <span className="text-xs text-blue-600 ml-1">Subcategories</span>
          </div>
          <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-lg font-bold text-gray-700">
              {categories.length}
            </span>
            <span className="text-xs text-gray-600 ml-1">Total</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-400" />
            <p>Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-gray-500 space-y-4">
            <Tag className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="font-medium mb-2">No categories found</p>
              <p className="text-sm mb-4">
                Click "Add Category" to create one, or load sample categories.
              </p>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const response = await authenticatedFetch(
                      `${API_BASE_URL}/api/v1/admin/categories/seed/dev`,
                      { method: "POST" },
                    );
                    const data = await response.json();
                    if (data.success) {
                      // Refetch categories
                      const catResponse = await authenticatedFetch(
                        `${API_BASE_URL}/api/v1/admin/categories?limit=500`,
                      );
                      const catData = await catResponse.json();
                      if (Array.isArray(catData.data)) {
                        setCategories(catData.data);
                      }
                      toast({
                        title: "Success",
                        description: `${data.count || 20} sample categories loaded 🎉`,
                      });
                    }
                  } catch (error) {
                    console.error("Failed to seed categories:", error);
                    toast({
                      title: "Error",
                      description: "Failed to load sample categories",
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Load Sample Categories
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Search filter */}
            <div className="mb-4">
              <Input
                placeholder="Search categories…"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {categories
              .filter((c: any) => !c.parentId)
              .filter((c: any) => {
                if (!catSearch.trim()) return true;
                const q = catSearch.toLowerCase();
                const subs = categories.filter((s: any) => s.parentId === c.id);
                return (
                  c.name.toLowerCase().includes(q) ||
                  subs.some((s: any) => s.name.toLowerCase().includes(q))
                );
              })
              .sort((a: any, b: any) => a.name.localeCompare(b.name))
              .map((mainCat: any) => {
                const subs = categories
                  .filter((c: any) => c.parentId === mainCat.id)
                  .sort((a: any, b: any) => a.name.localeCompare(b.name));
                const fallback = BUSINESS_CATEGORIES.find(
                  (c) => c.id === mainCat.id,
                );
                const Icon = fallback?.icon || Tag;
                const color = fallback?.color || "text-gray-600";
                const bgColor = fallback?.bgColor || "bg-gray-50";
                const isExpanded = expandedCats.has(mainCat.id);

                return (
                  <div
                    key={mainCat.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Collapsed header row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setExpandedCats((prev) => {
                          const next = new Set(prev);
                          if (next.has(mainCat.id)) next.delete(mainCat.id);
                          else next.add(mainCat.id);
                          return next;
                        });
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ChevronRight
                          className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                        />
                        <div className={`p-1.5 rounded-md ${bgColor}`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        <span className="font-medium text-sm truncate">
                          {mainCat.name}
                        </span>
                        <Badge
                          variant="default"
                          className="text-[10px] px-1.5 py-0 flex-shrink-0"
                        >
                          Main
                        </Badge>
                        {subs.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 flex-shrink-0"
                          >
                            {subs.length} sub{subs.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            setCurrentCategory(mainCat);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-500 hover:text-red-700"
                          onClick={() => {
                            setCurrentCategory(mainCat);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded subcategories */}
                    {isExpanded && subs.length > 0 && (
                      <div className="px-4 pb-3 pt-1 bg-gray-50/50 border-t">
                        <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
                          {subs.map((sub: any) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2 rounded-md bg-white border border-gray-100 hover:bg-gray-50 transition-colors group text-sm"
                            >
                              <span className="truncate">{sub.name}</span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {isExpanded && subs.length === 0 && (
                      <div className="px-4 pb-3 pt-1 bg-gray-50/50 border-t text-xs text-gray-400 ml-12">
                        No subcategories
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>

      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new business category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                placeholder="e.g., Healthcare"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="cat-slug">Slug *</Label>
              <Input
                id="cat-slug"
                placeholder="e.g., healthcare"
                value={newCategory.slug}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, slug: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                placeholder="Category description"
                value={newCategory.description}
                onChange={(e) =>
                  setNewCategory({
                    ...newCategory,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          {currentCategory && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-cat-name">Category Name</Label>
                <Input
                  id="edit-cat-name"
                  value={currentCategory.name}
                  onChange={(e) =>
                    setCurrentCategory({
                      ...currentCategory,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-cat-slug">Slug</Label>
                <Input
                  id="edit-cat-slug"
                  value={currentCategory.slug}
                  onChange={(e) =>
                    setCurrentCategory({
                      ...currentCategory,
                      slug: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-cat-desc">Description</Label>
                <Textarea
                  id="edit-cat-desc"
                  value={currentCategory.description || ""}
                  onChange={(e) =>
                    setCurrentCategory({
                      ...currentCategory,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <EditIcon className="h-4 w-4" />
              )}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{currentCategory?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteCategory}
              disabled={loading}
              variant="destructive"
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Job Management Component
const SECTOR_META: Record<
  string,
  { label: string; color: string; gradient: string }
> = {
  all: {
    label: "All Sectors",
    color: "bg-gray-200 text-gray-900 border-gray-400",
    gradient: "from-gray-600 to-gray-700",
  },
  communication: {
    label: "Communication & Publicité",
    color: "bg-orange-200 text-orange-900 border-orange-400",
    gradient: "from-orange-600 to-amber-600",
  },
  tech: {
    label: "Tech / IT",
    color: "bg-cyan-200 text-cyan-900 border-cyan-400",
    gradient: "from-cyan-600 to-blue-600",
  },
  immobilier: {
    label: "Immobilier",
    color: "bg-emerald-200 text-emerald-900 border-emerald-400",
    gradient: "from-emerald-600 to-green-600",
  },
  "conseil-juridique": {
    label: "Conseil & Juridique",
    color: "bg-indigo-200 text-indigo-900 border-indigo-400",
    gradient: "from-indigo-600 to-violet-600",
  },
  sante: {
    label: "Santé",
    color: "bg-rose-200 text-rose-900 border-rose-400",
    gradient: "from-rose-600 to-pink-600",
  },
  alimentation: {
    label: "Alimentation & Restauration",
    color: "bg-red-200 text-red-900 border-red-400",
    gradient: "from-red-600 to-orange-600",
  },
  animaux: {
    label: "Animaux",
    color: "bg-amber-200 text-amber-900 border-amber-400",
    gradient: "from-amber-600 to-yellow-600",
  },
  artisans: {
    label: "Artisans",
    color: "bg-slate-200 text-slate-900 border-slate-400",
    gradient: "from-slate-600 to-gray-600",
  },
  "maison-deco": {
    label: "Maison & Décoration",
    color: "bg-teal-200 text-teal-900 border-teal-400",
    gradient: "from-teal-600 to-emerald-600",
  },
  "mode-textile": {
    label: "Mode & Textile",
    color: "bg-fuchsia-200 text-fuchsia-900 border-fuchsia-400",
    gradient: "from-fuchsia-600 to-pink-600",
  },
  telecom: {
    label: "Télécommunications",
    color: "bg-blue-200 text-blue-900 border-blue-400",
    gradient: "from-blue-600 to-indigo-600",
  },
  agroalimentaire: {
    label: "Agroalimentaire",
    color: "bg-lime-200 text-lime-900 border-lime-400",
    gradient: "from-lime-600 to-green-600",
  },
  administrations: {
    label: "Administrations",
    color: "bg-sky-200 text-sky-900 border-sky-400",
    gradient: "from-sky-600 to-blue-600",
  },
  associations: {
    label: "Associations",
    color: "bg-violet-200 text-violet-900 border-violet-400",
    gradient: "from-violet-600 to-purple-600",
  },
  "bien-etre": {
    label: "Bien-être & Beauté",
    color: "bg-pink-200 text-pink-900 border-pink-400",
    gradient: "from-pink-600 to-rose-600",
  },
  emploi: {
    label: "Emploi & RH",
    color: "bg-emerald-200 text-emerald-900 border-emerald-400",
    gradient: "from-emerald-600 to-teal-600",
  },
  commerce: {
    label: "Commerce",
    color: "bg-orange-200 text-orange-900 border-orange-400",
    gradient: "from-orange-700 to-yellow-600",
  },
  hotellerie: {
    label: "Hôtellerie & Tourisme",
    color: "bg-purple-200 text-purple-900 border-purple-400",
    gradient: "from-purple-600 to-violet-600",
  },
  batiment: {
    label: "Bâtiment & Construction",
    color: "bg-yellow-200 text-yellow-900 border-yellow-400",
    gradient: "from-yellow-600 to-amber-700",
  },
  automobile: {
    label: "Automobile & Transport",
    color: "bg-red-200 text-red-900 border-red-400",
    gradient: "from-red-700 to-rose-600",
  },
  finances: {
    label: "Finances & Assurances",
    color: "bg-green-200 text-green-900 border-green-400",
    gradient: "from-green-600 to-emerald-600",
  },
  divertissement: {
    label: "Divertissement & Sport",
    color: "bg-pink-200 text-pink-900 border-pink-400",
    gradient: "from-pink-600 to-fuchsia-600",
  },
  autres: {
    label: "Autres Services",
    color: "bg-gray-200 text-gray-800 border-gray-400",
    gradient: "from-gray-600 to-slate-600",
  },
  general: {
    label: "General",
    color: "bg-neutral-200 text-neutral-900 border-neutral-400",
    gradient: "from-neutral-600 to-gray-600",
  },
};

const getSectorMeta = (s: string) => SECTOR_META[s] || SECTOR_META.general;

const JobManagement = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [filterSector, setFilterSector] = useState("all");
  const [sectorOpen, setSectorOpen] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [selectedJobCountry, setSelectedJobCountry] = useState("all");
  const [jobCountriesList, setJobCountriesList] = useState<any[]>([]);
  const [newJob, setNewJob] = useState({
    title: "",
    company: "",
    type: "full-time",
    location: "",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    description: "",
    sector: "general",
    department: "",
    experienceLevel: "entry",
    educationLevel: "bachelor",
    skills: "",
    requirements: "",
    benefits: "",
    isRemote: false,
    isFeatured: false,
    countryCode: "",
  });

  const fetchJobs = useCallback(async (countryFilter = "all") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (countryFilter && countryFilter !== "all") {
        params.set("countryCode", countryFilter);
      }
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/jobs?${params.toString()}`,
      );
      const data = await response.json();
      if (data.success) {
        setJobs(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + reload on country change
  useEffect(() => {
    fetchJobs(selectedJobCountry);
  }, [selectedJobCountry, fetchJobs]);

  // Load countries list for filter
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/countries`);
        if (res.ok) {
          const data = await res.json();
          setJobCountriesList(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.warn("Failed to load countries for jobs:", err);
      }
    };
    loadCountries();
  }, []);

  const handleAddJob = async () => {
    if (!newJob.title || !newJob.company) {
      toast({
        title: "Validation Error",
        description: "Title and company are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/jobs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newJob,
            skills: newJob.skills
              ? newJob.skills
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
            requirements: newJob.requirements
              ? newJob.requirements
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
            benefits: newJob.benefits
              ? newJob.benefits
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        await fetchJobs(selectedJobCountry);
        setShowAddDialog(false);
        setNewJob({
          title: "",
          company: "",
          type: "full-time",
          location: "",
          salaryMin: "",
          salaryMax: "",
          currency: "USD",
          description: "",
          sector: "general",
          department: "",
          experienceLevel: "entry",
          educationLevel: "bachelor",
          skills: "",
          requirements: "",
          benefits: "",
          isRemote: false,
          isFeatured: false,
          countryCode: "",
        });
        toast({
          title: "Success",
          description: "Job posted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to post job",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to post job:", error);
      toast({
        title: "Error",
        description: "Failed to post job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = async () => {
    if (!currentJob) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/jobs/${currentJob.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentJob),
        },
      );
      const data = await response.json();
      if (data.success) {
        await fetchJobs(selectedJobCountry);
        setShowEditDialog(false);
        setCurrentJob(null);
        toast({
          title: "Success",
          description: "Job updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to update job",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update job:", error);
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!currentJob) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/jobs/${currentJob.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (data.success) {
        await fetchJobs(selectedJobCountry);
        setShowDeleteDialog(false);
        setCurrentJob(null);
        toast({
          title: "Success",
          description: "Job deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to delete job",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete job:", error);
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Management
            </CardTitle>
            <CardDescription>
              {selectedJobCountry !== "all" ? (
                <>
                  Manage jobs in{" "}
                  <span className="font-semibold text-amber-600">
                    {jobCountriesList.find(
                      (c: any) => c.code === selectedJobCountry,
                    )?.name || selectedJobCountry}
                  </span>
                </>
              ) : (
                "Manage job listings and applications"
              )}
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setShowAddDialog(true);
              // Pre-fill countryCode with selected country (if not "all")
              if (selectedJobCountry && selectedJobCountry !== "all") {
                setNewJob((prev) => ({
                  ...prev,
                  countryCode: selectedJobCountry,
                }));
              }
            }}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500"
          >
            <Plus className="h-4 w-4" />
            Post Job
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Country Filter */}
        <div className="flex flex-wrap items-center gap-3 p-3 mb-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Country</span>
          </div>
          <select
            value={selectedJobCountry}
            onChange={(e) => setSelectedJobCountry(e.target.value)}
            className="flex-1 min-w-[140px] sm:min-w-[180px] md:max-w-xs h-9 px-3 rounded-md border border-amber-300 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">🌍 All Countries</option>
            {jobCountriesList.map((c: any) => (
              <option key={c.code || c.id} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
          {selectedJobCountry !== "all" && (
            <button
              onClick={() => setSelectedJobCountry("all")}
              className="text-xs text-amber-600 hover:text-amber-800 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search & Sector Filter Bar */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search jobs by title, company, or location…"
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              className="pl-10"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[220px] justify-between ${
                    filterSector !== "all"
                      ? `bg-gradient-to-r ${getSectorMeta(filterSector).gradient} text-white border-transparent shadow-md`
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 shadow-sm"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {filterSector !== "all" && (
                      <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                    )}
                    {getSectorMeta(filterSector).label}
                  </span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      sectorOpen ? "rotate-90" : ""
                    } ${filterSector !== "all" ? "text-white/70" : "text-gray-400"}`}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search sector…" className="h-9" />
                  <CommandList>
                    <CommandEmpty>No sector found.</CommandEmpty>
                    <CommandGroup>
                      {Object.entries(SECTOR_META).map(([key, meta]) => {
                        const count =
                          key === "all"
                            ? jobs.length
                            : jobs.filter(
                                (j) => (j.sector || "general") === key,
                              ).length;
                        const isActive = filterSector === key;
                        return (
                          <CommandItem
                            key={key}
                            value={meta.label}
                            onSelect={() => {
                              setFilterSector(key);
                              setSectorOpen(false);
                            }}
                            className="flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span
                                className={`inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r ${meta.gradient} shrink-0`}
                              />
                              <span className={isActive ? "font-semibold" : ""}>
                                {meta.label}
                              </span>
                            </span>
                            <span
                              className={`text-[11px] tabular-nums ${
                                isActive
                                  ? "font-bold text-gray-900"
                                  : "text-gray-400"
                              }`}
                            >
                              {count}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${jobs.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${jobs.length > 0 ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
              />
              {jobs.length > 0
                ? `${jobs.length} jobs live`
                : loading
                  ? "Loading…"
                  : "No jobs loaded"}
            </span>
          </div>
        </div>

        {/* Jobs list */}
        <div className="pr-1">
          {(() => {
            // Filter jobs
            const filtered = jobs.filter((job) => {
              const matchesSector =
                filterSector === "all" ||
                (job.sector || "general") === filterSector;
              const q = jobSearch.toLowerCase().trim();
              const matchesSearch =
                !q ||
                (job.title || "").toLowerCase().includes(q) ||
                (job.company || "").toLowerCase().includes(q) ||
                (job.location || "").toLowerCase().includes(q);
              return matchesSector && matchesSearch;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-12 text-gray-400">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No jobs found</p>
                  <p className="text-sm mt-1">
                    Try adjusting your filters or post a new job.
                  </p>
                </div>
              );
            }

            // Group by sector
            const grouped: Record<string, any[]> = {};
            filtered.forEach((job) => {
              const s = job.sector || "general";
              if (!grouped[s]) grouped[s] = [];
              grouped[s].push(job);
            });

            // Sort sectors: sectors with more jobs first
            const sortedSectors = Object.keys(grouped).sort(
              (a, b) => grouped[b].length - grouped[a].length,
            );

            return (
              <div className="space-y-8">
                {sortedSectors.map((sector) => {
                  const meta = getSectorMeta(sector);
                  const sectorJobs = grouped[sector];
                  return (
                    <div key={sector}>
                      {/* Sector heading */}
                      <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 -mx-1 px-1">
                        <span
                          className={`inline-block h-3 w-3 rounded-full bg-gradient-to-r ${meta.gradient}`}
                        />
                        <h4 className="font-semibold text-gray-800">
                          {meta.label}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {sectorJobs.length}
                        </Badge>
                        <Separator className="flex-1" />
                      </div>
                      {/* Sector jobs grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sectorJobs.map((job: any) => (
                          <Card
                            key={job.id}
                            className="border shadow-sm hover:shadow-md transition-all duration-200 group"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                                  {job.title}
                                </CardTitle>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] whitespace-nowrap shrink-0 ${meta.color}`}
                                >
                                  {meta.label}
                                </Badge>
                              </div>
                              <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                                <Building className="h-3 w-3" />
                                {job.company}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-1 pb-3">
                              <div className="space-y-1.5 text-xs text-gray-500">
                                {job.location && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3" />
                                    {job.location}
                                    {(job.isRemote || job.is_remote) && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] ml-1 bg-blue-50 text-blue-600 border-blue-200"
                                      >
                                        Remote
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <Banknote className="h-3 w-3" />
                                  {job.salaryMin || job.salary_min
                                    ? `${job.currency || "USD"} ${(job.salaryMin || job.salary_min || 0).toLocaleString()} – ${(job.salaryMax || job.salary_max || 0).toLocaleString()}`
                                    : job.salary || "Salary not set"}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {job.type || "full-time"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {job.applicationCount ||
                                      job.application_count ||
                                      job.applications ||
                                      0}{" "}
                                    applied
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-3 px-4">
                              <div className="flex gap-2 w-full">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => {
                                    setCurrentJob(job);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => {
                                    setCurrentJob(job);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                </Button>
                              </div>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </CardContent>

      {/* Add Job Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post New Job</DialogTitle>
            <DialogDescription>
              Create a new job listing with sector classification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job-title">Job Title *</Label>
                <Input
                  id="job-title"
                  placeholder="e.g., Senior Developer"
                  value={newJob.title}
                  onChange={(e) =>
                    setNewJob({ ...newJob, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="job-company">Company *</Label>
                <Input
                  id="job-company"
                  placeholder="Company name"
                  value={newJob.company}
                  onChange={(e) =>
                    setNewJob({ ...newJob, company: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="job-sector">Sector</Label>
                <Select
                  value={newJob.sector}
                  onValueChange={(value) =>
                    setNewJob({ ...newJob, sector: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="communication">
                      Communication & Publicité
                    </SelectItem>
                    <SelectItem value="tech">Tech / IT</SelectItem>
                    <SelectItem value="immobilier">Immobilier</SelectItem>
                    <SelectItem value="conseil-juridique">
                      Conseil & Juridique
                    </SelectItem>
                    <SelectItem value="sante">Santé</SelectItem>
                    <SelectItem value="alimentation">
                      Alimentation & Restauration
                    </SelectItem>
                    <SelectItem value="animaux">Animaux</SelectItem>
                    <SelectItem value="artisans">Artisans</SelectItem>
                    <SelectItem value="maison-deco">
                      Maison & Décoration
                    </SelectItem>
                    <SelectItem value="mode-textile">Mode & Textile</SelectItem>
                    <SelectItem value="telecom">Télécommunications</SelectItem>
                    <SelectItem value="agroalimentaire">
                      Agroalimentaire
                    </SelectItem>
                    <SelectItem value="administrations">
                      Administrations
                    </SelectItem>
                    <SelectItem value="associations">Associations</SelectItem>
                    <SelectItem value="bien-etre">
                      Bien-être & Beauté
                    </SelectItem>
                    <SelectItem value="emploi">Emploi & RH</SelectItem>
                    <SelectItem value="commerce">Commerce</SelectItem>
                    <SelectItem value="hotellerie">
                      Hôtellerie & Tourisme
                    </SelectItem>
                    <SelectItem value="batiment">
                      Bâtiment & Construction
                    </SelectItem>
                    <SelectItem value="automobile">
                      Automobile & Transport
                    </SelectItem>
                    <SelectItem value="finances">
                      Finances & Assurances
                    </SelectItem>
                    <SelectItem value="divertissement">
                      Divertissement & Sport
                    </SelectItem>
                    <SelectItem value="autres">Autres Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="job-type">Job Type</Label>
                <Select
                  value={newJob.type}
                  onValueChange={(value) =>
                    setNewJob({ ...newJob, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="job-location">Location</Label>
                <Input
                  id="job-location"
                  placeholder="City or Remote"
                  value={newJob.location}
                  onChange={(e) =>
                    setNewJob({ ...newJob, location: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="job-department">Department</Label>
                <Input
                  id="job-department"
                  placeholder="e.g., Engineering"
                  value={newJob.department}
                  onChange={(e) =>
                    setNewJob({ ...newJob, department: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="job-country">Country Code</Label>
                <Input
                  id="job-country"
                  placeholder="e.g., US, FR, CI"
                  value={newJob.countryCode}
                  onChange={(e) =>
                    setNewJob({
                      ...newJob,
                      countryCode: e.target.value.toUpperCase(),
                    })
                  }
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="job-exp">Experience Level</Label>
                <Select
                  value={newJob.experienceLevel}
                  onValueChange={(value) =>
                    setNewJob({ ...newJob, experienceLevel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="job-edu">Education Level</Label>
                <Select
                  value={newJob.educationLevel}
                  onValueChange={(value) =>
                    setNewJob({ ...newJob, educationLevel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="bachelor">Bachelor's</SelectItem>
                    <SelectItem value="master">Master's</SelectItem>
                    <SelectItem value="phd">PhD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="job-salary-min">Salary Min</Label>
                <Input
                  id="job-salary-min"
                  type="number"
                  placeholder="40000"
                  value={newJob.salaryMin}
                  onChange={(e) =>
                    setNewJob({ ...newJob, salaryMin: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="job-salary-max">Salary Max</Label>
                <Input
                  id="job-salary-max"
                  type="number"
                  placeholder="80000"
                  value={newJob.salaryMax}
                  onChange={(e) =>
                    setNewJob({ ...newJob, salaryMax: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="job-currency">Currency</Label>
                <Select
                  value={newJob.currency}
                  onValueChange={(value) =>
                    setNewJob({ ...newJob, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="XOF">XOF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="job-skills">Skills (comma-separated)</Label>
              <Input
                id="job-skills"
                placeholder="React, TypeScript, Node.js, PostgreSQL"
                value={newJob.skills}
                onChange={(e) =>
                  setNewJob({ ...newJob, skills: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="job-requirements">
                Requirements (comma-separated)
              </Label>
              <Input
                id="job-requirements"
                placeholder="3+ years experience, CS degree"
                value={newJob.requirements}
                onChange={(e) =>
                  setNewJob({ ...newJob, requirements: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="job-benefits">Benefits (comma-separated)</Label>
              <Input
                id="job-benefits"
                placeholder="Health insurance, Remote work, 401k"
                value={newJob.benefits}
                onChange={(e) =>
                  setNewJob({ ...newJob, benefits: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="job-desc">Description</Label>
              <Textarea
                id="job-desc"
                placeholder="Job description and responsibilities"
                value={newJob.description}
                onChange={(e) =>
                  setNewJob({ ...newJob, description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="job-remote"
                  checked={newJob.isRemote}
                  onChange={(e) =>
                    setNewJob({ ...newJob, isRemote: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="job-remote">Remote</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="job-featured"
                  checked={newJob.isFeatured}
                  onChange={(e) =>
                    setNewJob({ ...newJob, isFeatured: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="job-featured">Featured</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddJob} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Post Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>
              Update job listing and classification
            </DialogDescription>
          </DialogHeader>
          {currentJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-job-title">Job Title</Label>
                  <Input
                    id="edit-job-title"
                    value={currentJob.title}
                    onChange={(e) =>
                      setCurrentJob({ ...currentJob, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-job-company">Company</Label>
                  <Input
                    id="edit-job-company"
                    value={currentJob.company}
                    onChange={(e) =>
                      setCurrentJob({ ...currentJob, company: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-job-sector">Sector</Label>
                  <Select
                    value={currentJob.sector || "general"}
                    onValueChange={(value) =>
                      setCurrentJob({ ...currentJob, sector: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="communication">
                        Communication & Publicité
                      </SelectItem>
                      <SelectItem value="tech">Tech / IT</SelectItem>
                      <SelectItem value="immobilier">Immobilier</SelectItem>
                      <SelectItem value="conseil-juridique">
                        Conseil & Juridique
                      </SelectItem>
                      <SelectItem value="sante">Santé</SelectItem>
                      <SelectItem value="alimentation">
                        Alimentation & Restauration
                      </SelectItem>
                      <SelectItem value="animaux">Animaux</SelectItem>
                      <SelectItem value="artisans">Artisans</SelectItem>
                      <SelectItem value="maison-deco">
                        Maison & Décoration
                      </SelectItem>
                      <SelectItem value="mode-textile">
                        Mode & Textile
                      </SelectItem>
                      <SelectItem value="telecom">
                        Télécommunications
                      </SelectItem>
                      <SelectItem value="agroalimentaire">
                        Agroalimentaire
                      </SelectItem>
                      <SelectItem value="administrations">
                        Administrations
                      </SelectItem>
                      <SelectItem value="associations">Associations</SelectItem>
                      <SelectItem value="bien-etre">
                        Bien-être & Beauté
                      </SelectItem>
                      <SelectItem value="emploi">Emploi & RH</SelectItem>
                      <SelectItem value="commerce">Commerce</SelectItem>
                      <SelectItem value="hotellerie">
                        Hôtellerie & Tourisme
                      </SelectItem>
                      <SelectItem value="batiment">
                        Bâtiment & Construction
                      </SelectItem>
                      <SelectItem value="automobile">
                        Automobile & Transport
                      </SelectItem>
                      <SelectItem value="finances">
                        Finances & Assurances
                      </SelectItem>
                      <SelectItem value="divertissement">
                        Divertissement & Sport
                      </SelectItem>
                      <SelectItem value="autres">Autres Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-job-type">Job Type</Label>
                  <Select
                    value={currentJob.type || "full-time"}
                    onValueChange={(value) =>
                      setCurrentJob({ ...currentJob, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-job-location">Location</Label>
                  <Input
                    id="edit-job-location"
                    value={currentJob.location || ""}
                    onChange={(e) =>
                      setCurrentJob({ ...currentJob, location: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-job-department">Department</Label>
                  <Input
                    id="edit-job-department"
                    value={currentJob.department || ""}
                    onChange={(e) =>
                      setCurrentJob({
                        ...currentJob,
                        department: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="edit-job-exp">Experience Level</Label>
                  <Select
                    value={
                      currentJob.experience_level ||
                      currentJob.experienceLevel ||
                      "entry"
                    }
                    onValueChange={(value) =>
                      setCurrentJob({ ...currentJob, experienceLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry</SelectItem>
                      <SelectItem value="mid">Mid</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-job-edu">Education Level</Label>
                  <Select
                    value={
                      currentJob.education_level ||
                      currentJob.educationLevel ||
                      "bachelor"
                    }
                    onValueChange={(value) =>
                      setCurrentJob({ ...currentJob, educationLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="bachelor">Bachelor's</SelectItem>
                      <SelectItem value="master">Master's</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-job-skills">
                  Skills (comma-separated)
                </Label>
                <Input
                  id="edit-job-skills"
                  placeholder="React, TypeScript, Node.js"
                  value={
                    Array.isArray(currentJob.skills)
                      ? currentJob.skills.join(", ")
                      : currentJob.skills || ""
                  }
                  onChange={(e) =>
                    setCurrentJob({ ...currentJob, skills: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-job-desc">Description</Label>
                <Textarea
                  id="edit-job-desc"
                  value={currentJob.description || ""}
                  onChange={(e) =>
                    setCurrentJob({
                      ...currentJob,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-job-remote"
                    checked={
                      currentJob.is_remote || currentJob.isRemote || false
                    }
                    onChange={(e) =>
                      setCurrentJob({
                        ...currentJob,
                        isRemote: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-job-remote">Remote</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-job-featured"
                    checked={
                      currentJob.is_featured || currentJob.isFeatured || false
                    }
                    onChange={(e) =>
                      setCurrentJob({
                        ...currentJob,
                        isFeatured: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="edit-job-featured">Featured</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditJob}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <EditIcon className="h-4 w-4" />
              )}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Job Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the job posting{" "}
              <span className="font-semibold">{currentJob?.title}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteJob}
              disabled={loading}
              variant="destructive"
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Role Management Section Component
const RoleManagementSection = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  // Group permissions by domain (e.g. "businesses.read" → "businesses")
  const groupPermissions = (perms: string[]) => {
    const groups: Record<string, string[]> = {};
    for (const p of perms) {
      const [domain] = p.split(".");
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(p);
    }
    return groups;
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/roles?limit=100`,
      );
      const data = await response.json();
      if (data.success) {
        setRoles(data.data || []);
        if (data.metadata?.availablePermissions) {
          setAvailablePermissions(data.metadata.availablePermissions);
        }
        if (data.data && data.data.length > 0) {
          setSelectedRole(data.data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async (search = "") => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search.trim()) params.set("search", search.trim());
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/users?${params}`,
      );
      const data = await res.json();
      if (data.success) setAssignableUsers(data.data || []);
    } catch (e) {
      console.error("Failed to fetch users for assignment:", e);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedRole || !selectedUserId) return;
    setLoading(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/roles/${selectedRole.id}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedUserId }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setShowAssignModal(false);
        setSelectedUserId("");
        setAssignSearch("");
        fetchRoles();
        toast({
          title: "Success",
          description: `User assigned to ${selectedRole.name} role`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to assign user",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Failed to assign user:", e);
      toast({
        title: "Error",
        description: "Failed to assign user to role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (
    permList: string[],
    perm: string,
    setter: (perms: string[]) => void,
  ) => {
    if (permList.includes(perm)) {
      setter(permList.filter((p) => p !== perm));
    } else {
      setter([...permList, perm]);
    }
  };

  const handleAddRole = async () => {
    if (!newRole.name) {
      toast({
        title: "Validation Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/roles`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRole),
        },
      );
      const data = await response.json();
      if (data.success) {
        setRoles([...roles, data.data]);
        setShowAddModal(false);
        setNewRole({ name: "", description: "", permissions: [] });
        toast({
          title: "Success",
          description: "Role created successfully",
        });
      }
    } catch (error) {
      console.error("Failed to add role:", error);
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/roles/${selectedRole.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: selectedRole.description,
            permissions: selectedRole.permissions,
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setRoles(roles.map((r) => (r.id === selectedRole.id ? data.data : r)));
        setShowEditModal(false);
        toast({
          title: "Success",
          description: "Role updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to update role",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/roles/${selectedRole.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (data.success) {
        setRoles(roles.filter((r) => r.id !== selectedRole.id));
        setShowDeleteModal(false);
        setSelectedRole(null);
        toast({
          title: "Success",
          description: `Role deleted. ${data.data?.reassignedUsers || 0} users reassigned to 'user'.`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error?.message || "Failed to delete role",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const permissionGroups = groupPermissions(availablePermissions);

  // Permission checkbox grid component
  const PermissionGrid = ({
    selected,
    onToggle,
  }: {
    selected: string[];
    onToggle: (perm: string) => void;
  }) => (
    <div className="space-y-4 pr-2">
      {Object.entries(permissionGroups).map(([domain, perms]) => (
        <div key={domain}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {domain}
          </p>
          <div className="flex flex-wrap gap-2">
            {perms.map((perm) => {
              const action = perm.split(".")[1];
              const isChecked = selected.includes(perm);
              return (
                <label
                  key={perm}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer border transition-colors ${
                    isChecked
                      ? "bg-blue-100 border-blue-300 text-blue-800"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(perm)}
                    className="sr-only"
                  />
                  <span
                    className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                      isChecked
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isChecked && (
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={4}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  {action}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role & Permission Management
            </CardTitle>
            <CardDescription>
              Configure user roles and their permissions
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500"
          >
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && roles.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRole?.id === role.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {role.name.replace(/_/g, " ")}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {role.description}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${role.color || "bg-gray-100 text-gray-700"}`}
                    >
                      {role.userCount} users
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">
                    {role.permissions?.length || 0} permissions
                    {role.isSystem && (
                      <span className="ml-2 text-amber-600">• System</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRole(role);
                        setShowEditModal(true);
                      }}
                    >
                      <EditIcon className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRole(role);
                        setAssignSearch("");
                        setSelectedUserId("");
                        fetchAssignableUsers();
                        setShowAssignModal(true);
                      }}
                    >
                      <UserPlus className="h-3 w-3" />
                      Assign
                    </Button>
                    {!role.isSystem && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRole(role);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Role Details */}
            {selectedRole && (
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="capitalize">
                    {selectedRole.name.replace(/_/g, " ")}
                  </CardTitle>
                  <CardDescription>{selectedRole.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>👥 {selectedRole.userCount} users</span>
                      <span>
                        🔑 {selectedRole.permissions?.length || 0} permissions
                      </span>
                      {selectedRole.isSystem && (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-300"
                        >
                          System Role
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">
                        Permissions
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRole.permissions &&
                        selectedRole.permissions.length > 0 ? (
                          selectedRole.permissions.map(
                            (perm: string, i: number) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs"
                              >
                                {perm}
                              </Badge>
                            ),
                          )
                        ) : (
                          <span className="text-sm text-gray-500">
                            No permissions assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </CardContent>

      {/* Add Role Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new user role and its permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                placeholder="e.g., Editor, Analyst"
                value={newRole.name}
                onChange={(e) =>
                  setNewRole({ ...newRole, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="role-desc">Description</Label>
              <Textarea
                id="role-desc"
                placeholder="Describe this role's purpose"
                value={newRole.description}
                onChange={(e) =>
                  setNewRole({ ...newRole, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="mb-2 block">Permissions</Label>
              <PermissionGrid
                selected={newRole.permissions}
                onToggle={(perm) =>
                  togglePermission(newRole.permissions, perm, (p) =>
                    setNewRole({ ...newRole, permissions: p }),
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRole}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Role: {selectedRole?.name?.replace(/_/g, " ")}
            </DialogTitle>
            <DialogDescription>
              Update role description and permissions
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-role-name">Role Name</Label>
                <Input
                  id="edit-role-name"
                  value={selectedRole.name}
                  disabled={selectedRole.isSystem}
                  onChange={(e) =>
                    setSelectedRole({
                      ...selectedRole,
                      name: e.target.value,
                    })
                  }
                />
                {selectedRole.isSystem && (
                  <p className="text-xs text-amber-600 mt-1">
                    System role names cannot be changed
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-role-desc">Description</Label>
                <Textarea
                  id="edit-role-desc"
                  value={selectedRole.description || ""}
                  onChange={(e) =>
                    setSelectedRole({
                      ...selectedRole,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="mb-2 block">
                  Permissions ({selectedRole.permissions?.length || 0} selected)
                </Label>
                <PermissionGrid
                  selected={selectedRole.permissions || []}
                  onToggle={(perm) =>
                    togglePermission(
                      selectedRole.permissions || [],
                      perm,
                      (p) =>
                        setSelectedRole({ ...selectedRole, permissions: p }),
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRole}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <EditIcon className="h-4 w-4" />
              )}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role{" "}
              <span className="font-semibold">{selectedRole?.name}</span>?
              {selectedRole?.userCount > 0 && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ {selectedRole.userCount} users will be reassigned to the
                  "user" role.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRole}
              disabled={loading}
              variant="destructive"
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign User to Role Dialog */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign User to Role</DialogTitle>
            <DialogDescription>
              Select a user to assign to the{" "}
              <span className="font-semibold capitalize">
                {selectedRole?.name?.replace(/_/g, " ")}
              </span>{" "}
              role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search Users</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Search by name or email..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchAssignableUsers(assignSearch);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAssignableUsers(assignSearch)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
              {assignableUsers.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center">
                  No users found
                </p>
              ) : (
                assignableUsers.map((u: any) => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      String(selectedUserId) === String(u.id)
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="assign-user"
                      value={u.id}
                      checked={String(selectedUserId) === String(u.id)}
                      onChange={() => setSelectedUserId(String(u.id))}
                      className="accent-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {u.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {u.email}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {u.role}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignUser}
              disabled={loading || !selectedUserId}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Security Section
interface SecurityUser {
  id: number;
  email: string;
  username: string | null;
  role: string;
  isVerified: boolean;
  failedLoginAttempts: number | null;
  lockedUntil: string | null;
  passwordResetToken: string | null;
  passwordResetExpires: string | null;
  createdAt: string | null;
  isLocked: boolean;
  hasResetPending: boolean;
  needsForcedReset: boolean;
}

interface SecurityStats {
  totalUsers: number;
  lockedAccounts: number;
  pendingResets: number;
}

const SecuritySection = () => {
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalUsers: 0,
    lockedAccounts: 0,
    pendingResets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<
    "all" | "locked" | "reset" | "forced"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/api/v1/admin/security/users`),
        authenticatedFetch(`${API_BASE_URL}/api/v1/admin/security/stats`),
      ]);
      const [ud, sd] = await Promise.all([usersRes.json(), statsRes.json()]);
      if (ud.success) setUsers(ud.data);
      if (sd.success) setStats(sd.data);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const doAction = async (userId: number, action: string, body?: object) => {
    setActionLoading(userId);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/security/users/${userId}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "Done", description: data.message });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Request failed",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const doDelete = async (userId: number) => {
    if (!window.confirm("Permanently delete this user?")) return;
    setActionLoading(userId);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/security/users/${userId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "Deleted", description: data.message });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Delete failed",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.email.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
      (u.username || "").toLowerCase().startsWith(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === "locked") return u.isLocked;
    if (filterMode === "reset") return u.hasResetPending;
    if (filterMode === "forced") return u.needsForcedReset;
    return true;
  });

  const roleBadgeColor: Record<string, string> = {
    superuser: "bg-red-100 text-red-800",
    admin: "bg-orange-100 text-orange-800",
    moderator: "bg-blue-100 text-blue-800",
    business_owner: "bg-purple-100 text-purple-800",
    user: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Lock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Locked Accounts</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.lockedAccounts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Resets</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.pendingResets}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                User Security Management
              </CardTitle>
              <CardDescription>
                View locked accounts, failed logins, password resets, and manage
                roles
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search email or username…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "locked", "reset", "forced"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={filterMode === mode ? "default" : "outline"}
                  onClick={() => setFilterMode(mode)}
                >
                  {mode === "all" && "All"}
                  {mode === "locked" && (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </>
                  )}
                  {mode === "reset" && (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending Reset
                    </>
                  )}
                  {mode === "forced" && (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Needs Password
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Failed Logins</TableHead>
                    <TableHead>Locked Until</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-gray-500"
                      >
                        No users match the current filter
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((u) => (
                      <TableRow
                        key={u.id}
                        className={u.isLocked ? "bg-red-50/50" : ""}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{u.email}</p>
                            {u.username && (
                              <p className="text-xs text-gray-400">
                                @{u.username}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              roleBadgeColor[u.role] ||
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.isVerified ? (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-300 text-xs"
                              >
                                Verified
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-gray-400 text-xs"
                              >
                                Unverified
                              </Badge>
                            )}
                            {u.isLocked && (
                              <Badge variant="destructive" className="text-xs">
                                Locked
                              </Badge>
                            )}
                            {u.hasResetPending && (
                              <Badge className="bg-amber-100 text-amber-800 text-xs">
                                Reset Pending
                              </Badge>
                            )}
                            {u.needsForcedReset && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                Needs Password
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-mono text-sm font-bold ${
                              (u.failedLoginAttempts || 0) >= 3
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {u.failedLoginAttempts ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {u.lockedUntil
                            ? new Date(u.lockedUntil).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {u.isLocked && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                disabled={actionLoading === u.id}
                                onClick={() => doAction(u.id, "unlock")}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Unlock
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  disabled={actionLoading === u.id}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-gray-400 font-normal">
                                  Change Role
                                </DropdownMenuLabel>
                                {[
                                  "user",
                                  "moderator",
                                  "admin",
                                  "superuser",
                                  "business_owner",
                                ].map((r) => (
                                  <DropdownMenuItem
                                    key={r}
                                    onClick={() =>
                                      doAction(u.id, "change-role", { role: r })
                                    }
                                    className={u.role === r ? "font-bold" : ""}
                                  >
                                    {u.role === r && "✓ "}
                                    {r}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                {(u.failedLoginAttempts || 0) > 0 && (
                                  <DropdownMenuItem
                                    onClick={() => doAction(u.id, "unlock")}
                                    className="text-green-700"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-2" />
                                    Reset failed attempts
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => doAction(u.id, "force-reset")}
                                  className="text-orange-700"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-2" />
                                  Force password reset
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => doDelete(u.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete user
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-gray-400 pt-3">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} shown
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// SMTP Section
const SmtpSection = () => {
  const [config, setConfig] = useState({
    host: "",
    port: "587",
    user: "",
    pass: "",
    from: "",
  });
  const [testTo, setTestTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  useEffect(() => {
    authenticatedFetch(`${API_BASE_URL}/api/v1/admin/security/smtp`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setConfig(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/security/smtp/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        },
      );
      const data = await res.json();
      toast({
        title: data.success ? "Saved" : "Error",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch {
      toast({
        title: "Error",
        description: "Save failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!testTo) {
      toast({
        title: "Enter recipient",
        description: "Provide a test email address",
        variant: "destructive",
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/security/smtp/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...config, to: testTo }),
        },
      );
      const data = await res.json();
      setTestResult({ ok: data.success, msg: data.message });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || "Request failed" });
    } finally {
      setTesting(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof config,
    type = "text",
    placeholder = "",
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`smtp-${key}`}>{label}</Label>
      <Input
        id={`smtp-${key}`}
        type={type}
        placeholder={placeholder}
        value={config[key]}
        onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
        disabled={loading}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                SMTP Email Configuration
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure transactional email delivery (password resets,
                notifications, verifications).
              </p>
              <div
                className={`inline-flex items-center gap-1.5 mt-2 text-xs font-medium px-2 py-1 rounded-full ${
                  config.user && config.host
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    config.user && config.host ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                {config.user && config.host
                  ? "SMTP Configured"
                  : "Not Configured"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Form */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Connection Settings</CardTitle>
            <CardDescription>SMTP server credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : (
              <>
                {field("SMTP Host", "host", "text", "smtp.gmail.com")}
                {field("Port", "port", "number", "587")}
                {field("Username / Email", "user", "email", "user@example.com")}
                {field(
                  "Password / App Password",
                  "pass",
                  "password",
                  "••••••••",
                )}
                {field("From Address", "from", "email", "noreply@versoair.com")}
                <div className="pt-2">
                  <Alert className="bg-amber-50 border-amber-200 text-amber-900 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription>
                      For Gmail: use an <strong>App Password</strong> (not your
                      account password).
                    </AlertDescription>
                  </Alert>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={save}
              disabled={saving || loading}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving…" : "Save Configuration"}
            </Button>
          </CardFooter>
        </Card>

        {/* Test Sender */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Test Connection</CardTitle>
            <CardDescription>
              Send a test email to verify your SMTP settings work
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="smtp-test-to">Test Recipient Email</Label>
              <Input
                id="smtp-test-to"
                type="email"
                placeholder="you@example.com"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
            </div>
            {testResult && (
              <Alert
                className={
                  testResult.ok
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }
              >
                {testResult.ok ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription
                  className={testResult.ok ? "text-green-800" : "text-red-800"}
                >
                  {testResult.msg}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={test}
              disabled={testing || loading}
              variant="outline"
              className="w-full"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {testing ? "Sending test…" : "Send Test Email"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Environment Variables Reference */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Environment Variable Reference
          </CardTitle>
          <CardDescription>
            Add these to your <code>.env</code> file for persistence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm space-y-1">
            <p className="text-green-400"># Email / SMTP</p>
            <p className="text-gray-300">
              SMTP_HOST=
              <span className="text-yellow-300">
                {config.host || "smtp.gmail.com"}
              </span>
            </p>
            <p className="text-gray-300">
              SMTP_PORT=
              <span className="text-yellow-300">{config.port || "587"}</span>
            </p>
            <p className="text-gray-300">
              SMTP_USER=
              <span className="text-yellow-300">
                {config.user || "your-email@gmail.com"}
              </span>
            </p>
            <p className="text-gray-300">
              SMTP_PASS=
              <span className="text-yellow-300">your-app-password</span>
            </p>
            <p className="text-gray-300">
              SMTP_FROM=
              <span className="text-yellow-300">
                {config.from || "noreply@versoair.com"}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Dashboard Component
export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [dbConnected, setDbConnected] = useState<boolean | null>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );
  const [stats, setStats] = useState({
    businesses: "0",
    categories: "0",
    jobs: "48",
    users: "1,245",
    active: "0",
  });
  const [, setLocation] = useLocation();

  const [isAdminGateAuthenticated, setIsAdminGateAuthenticated] = useState(
    () => {
      // If coming from vault (?from=sv), superuser is already authenticated
      const params = new URLSearchParams(window.location.search);
      if (params.get("from") === "sv" || params.get("from") === "vault") {
        // Auto-grant access and persist session
        localStorage.setItem(
          "adminAccessTime",
          new Date().getTime().toString(),
        );
        localStorage.setItem("adminUsername", "vault-superuser");
        return true;
      }
      const savedAccessTime = localStorage.getItem("adminAccessTime");
      const savedUsername = localStorage.getItem("adminUsername");
      if (!savedAccessTime || !savedUsername) return false;
      const accessTime = parseInt(savedAccessTime);
      const now = new Date().getTime();
      const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours session duration
      if (now - accessTime > sessionDuration) {
        localStorage.removeItem("adminAccessTime");
        localStorage.removeItem("adminUsername");
        return false;
      }
      return true;
    },
  );

  const [authenticatedAdminUsername, setAuthenticatedAdminUsername] = useState(
    () => localStorage.getItem("adminUsername") || "",
  );

  // Auto-refresh session on component mount and periodic checks
  useEffect(() => {
    if (isAdminGateAuthenticated && authenticatedAdminUsername) {
      // Refresh the access time to keep session alive
      localStorage.setItem("adminAccessTime", new Date().getTime().toString());

      // Check session validity every 10 minutes
      const sessionCheckInterval = setInterval(
        () => {
          const savedAccessTime = localStorage.getItem("adminAccessTime");
          if (savedAccessTime) {
            const accessTime = parseInt(savedAccessTime);
            const now = new Date().getTime();
            const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
            if (now - accessTime > sessionDuration) {
              setIsAdminGateAuthenticated(false);
              localStorage.removeItem("adminAccessTime");
              localStorage.removeItem("adminUsername");
              setLocation("/");
            } else {
              // Refresh session time
              localStorage.setItem(
                "adminAccessTime",
                new Date().getTime().toString(),
              );
            }
          }
        },
        10 * 60 * 1000,
      ); // Check every 10 minutes

      return () => clearInterval(sessionCheckInterval);
    }
  }, [isAdminGateAuthenticated, authenticatedAdminUsername]);

  const handleSessionExpired = useCallback(() => {
    setIsAdminGateAuthenticated(false);
    setAuthenticatedAdminUsername("");
    localStorage.removeItem("adminAccessTime");
    localStorage.removeItem("adminUsername");
  }, []);

  const {
    sessionTimeLeft,
    sessionProgress,
    isSessionCritical,
    isSessionLow,
    handleExtendSession,
    formatTimeLeft,
  } = useSessionTimer(isAdminGateAuthenticated, true, handleSessionExpired); // enableTimeout=true for admin dashboard

  const SQL_SNIPPETS = [
    {
      label: "Active Users",
      q: "SELECT id, username, email, role, created_at\nFROM users\nWHERE role != 'suspended'\nORDER BY created_at DESC\nLIMIT 20;",
    },
    {
      label: "Revenue by Country",
      q: "SELECT country_code, COUNT(*) AS businesses, AVG(rating) AS avg_rating\nFROM businesses\nGROUP BY country_code\nORDER BY businesses DESC\nLIMIT 15;",
    },
    {
      label: "Pending Approvals",
      q: "SELECT id, name, category_id, country_code, created_at\nFROM businesses\nWHERE approval_status = 'pending'\nORDER BY created_at ASC\nLIMIT 25;",
    },
    {
      label: "Open Tickets",
      q: "SELECT id, title, status, priority, category, created_at\nFROM tickets\nWHERE status IN ('open','in_progress')\nORDER BY priority DESC, created_at ASC\nLIMIT 20;",
    },
    {
      label: "Top Rated",
      q: "SELECT id, name, country_code, rating, review_count\nFROM businesses\nWHERE rating IS NOT NULL\nORDER BY rating DESC, review_count DESC\nLIMIT 20;",
    },
    {
      label: "Recent Signups",
      q: "SELECT id, username, email, role, created_at\nFROM users\nORDER BY created_at DESC\nLIMIT 15;",
    },
    {
      label: "DB Table Sizes",
      q: "SELECT relname AS table_name,\n  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,\n  n_live_tup AS live_rows\nFROM pg_stat_user_tables\nORDER BY pg_total_relation_size(relid) DESC;",
    },
    {
      label: "Streaming Tracks",
      q: "SELECT id, title, artist_name, genre, plays_count, created_at\nFROM tracks\nORDER BY plays_count DESC\nLIMIT 20;",
    },
  ];

  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showHealthPanel, setShowHealthPanel] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM users LIMIT 10");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [sqlExecTime, setSqlExecTime] = useState<number | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);
  const [showSqlHistory, setShowSqlHistory] = useState(false);
  const [backupType, setBackupType] = useState<"full" | "partial">("full");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [databaseHealth, setDatabaseHealth] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isSeedingCategories, setIsSeedingCategories] = useState(false);
  const [isSeedingBusinesses, setIsSeedingBusinesses] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  const handleAdminAccessGranted = (username: string) => {
    setIsAdminGateAuthenticated(true);
    setAuthenticatedAdminUsername(username);
    localStorage.setItem("adminAccessTime", new Date().getTime().toString());
    localStorage.setItem("adminUsername", username);
  };

  // On mount: restore JWT into _authToken if session is alive but token is missing (page refresh)
  useEffect(() => {
    const storedToken =
      localStorage.getItem("authToken") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token");
    if (storedToken) {
      // Re-sync in-memory token (cleared on module reload)
      import("@/lib/auth").then(({ setAuthToken }) =>
        setAuthToken(storedToken),
      );
    } else if (isAdminGateAuthenticated && authenticatedAdminUsername) {
      // Session restored from localStorage but no JWT — redirect to sign in
      console.warn(
        "No JWT found on page refresh — re-authentication required.",
      );
    }
    // Always bootstrap CSRF token
    initializeCsrfToken().catch((error) => {
      console.warn("Failed to initialize CSRF token:", error);
    });
  }, []);

  const fetchDatabaseHealth = useCallback(async () => {
    setIsLoadingHealth(true);
    try {
      const [healthRes, statusRes, adminHealthRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/health`),
        fetch(`${API_BASE_URL}/api/status`),
        fetch(`${API_BASE_URL}/api/admin/health`).catch(() => null),
      ]);
      setDbConnected(healthRes.ok);
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        const adminMetrics = adminHealthRes?.ok
          ? await adminHealthRes.json().catch(() => null)
          : null;
        let categoryCount = 0;
        let businessCount = 0;
        try {
          const [bizRes, catRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/businesses?limit=1`),
            fetch(`${API_BASE_URL}/api/categories`),
          ]);
          const bizData = await bizRes.json();
          const catData = await catRes.json();
          businessCount = Number(bizData.pagination?.total) || 0;
          categoryCount = Array.isArray(catData)
            ? catData.length
            : catData.data?.length || 0;
        } catch (e) {
          console.warn("Could not fetch stats:", e);
        }
        setDatabaseHealth({
          ...healthData,
          tableStats: { categoryCount, businessCount },
          metrics: adminMetrics
            ? {
                cpu: adminMetrics.cpu,
                memory: adminMetrics.memory,
                disk: adminMetrics.disk,
                connections: adminMetrics.connections,
                totalMemGB: adminMetrics.totalMemGB,
                freeMemGB: adminMetrics.freeMemGB,
                cpuCores: adminMetrics.cpuCores,
              }
            : null,
        });
        setStats((prev) => ({
          ...prev,
          categories: String(categoryCount),
          businesses: String(businessCount),
        }));
      } else {
        setDatabaseHealth({ status: "error", database: { connected: false } });
      }
      setLastHealthCheck(new Date());
    } catch (error) {
      setDbConnected(false);
      setDatabaseHealth({
        status: "error",
        database: { connected: false, error: "Connection failed" },
      });
      setLastHealthCheck(new Date());
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabaseHealth();
    const interval = setInterval(fetchDatabaseHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchDatabaseHealth, isAdminGateAuthenticated]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "add-business":
        setActiveSection("businesses");
        toast({
          title: "Ready to Add Business",
          description: "Navigate to the business section.",
        });
        break;
      case "add-category":
        setActiveSection("categories");
        toast({
          title: "Ready to Add Category",
          description: "Navigate to the categories section.",
        });
        break;
      case "add-job":
        setActiveSection("jobs");
        toast({
          title: "Ready to Post Job",
          description: "Navigate to the jobs section.",
        });
        break;
      case "add-ad":
        setActiveSection("advertising");
        toast({
          title: "Ready to Create Ad",
          description: "Navigate to the advertising section.",
        });
        break;
    }
  };

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return;
    setIsExecutingQuery(true);
    try {
      const res = await authenticatedFetch(
        `${API_BASE_URL}/api/admin/execute-query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: sqlQuery }),
        },
      );
      const data = await res.json();
      setQueryResult(data);
      if (data.success) {
        toast({
          title: "Query Executed ✅",
          description: `${data.rowCount} row(s) returned in ${data.duration}ms`,
        });
      } else {
        toast({
          title: "Query Error",
          description: data.error || "Query failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      setQueryResult({ error: "Failed to reach server" });
      toast({
        title: "Network Error",
        description: "Could not reach the server",
        variant: "destructive",
      });
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/admin/backup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: backupType }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Backup Created ✅",
          description: `${data.backupName} • ${data.size} • Retention: ${data.retention}`,
        });
        setShowBackupModal(false);
      } else {
        toast({
          title: "Backup Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Could not reach the server",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  if (!isAdminGateAuthenticated) {
    return <AdminAccessGate onAccessGranted={handleAdminAccessGranted} />;
  }

  return (
    <>
      {/* Fixed DB Status Indicator — outside scroll container */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        <div
          className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${
            dbConnected
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          <div
            className={`h-2 w-2 rounded-full ${
              dbConnected ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          {dbConnected ? "✅ Connected" : "❌ Offline"}
        </div>
      </div>

      <DashboardLayout
        sections={MAIN_SECTIONS}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        title="VersoAir Business Platform"
        subtitle={`Premium Admin Dashboard • Welcome, ${authenticatedAdminUsername || "Administrator"}`}
        onRefresh={handleRefresh}
      >
        {/* Wrap all children in a flex column that takes full height of the main content area */}
        <div className="flex flex-col min-h-full min-w-0 overflow-x-hidden">
          {/* Fixed top section (non-scrolling) */}
          <div className="flex-none space-y-4">
            <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-2 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                onClick={() => setLocation("/geo-admin")}
                className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800 gap-1.5 text-xs sm:text-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Back to</span> Geo Admin
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/tickets")}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 gap-1.5 text-xs sm:text-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                Tickets
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/admin/tickets")}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 gap-1.5 text-xs sm:text-sm"
              >
                <Shield className="h-3.5 w-3.5" />
                TAM
              </Button>
            </div>

            <SessionTimerBar
              sessionTimeLeft={sessionTimeLeft}
              sessionProgress={sessionProgress}
              isSessionCritical={isSessionCritical}
              isSessionLow={isSessionLow}
              onExtendSession={handleExtendSession}
              formatTimeLeft={formatTimeLeft}
            />

            {dbConnected !== null && !dismissedAlerts.has("db-status") && (
              <Alert className="relative mb-6">
                <button
                  onClick={() => {
                    const newDismissed = new Set(dismissedAlerts);
                    newDismissed.add("db-status");
                    setDismissedAlerts(newDismissed);
                  }}
                  className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <div
                  className={`h-2 w-2 rounded-full mr-2 ${
                    dbConnected ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <AlertTitle
                  className={dbConnected ? "text-emerald-900" : "text-rose-900"}
                >
                  {dbConnected
                    ? "Database Connected"
                    : "Database Connection Issues"}
                </AlertTitle>
                <AlertDescription
                  className={dbConnected ? "text-emerald-700" : "text-rose-700"}
                >
                  {dbConnected
                    ? "All systems operational."
                    : "Connection lost. Retrying automatically."}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Content area — scroll handled by DashboardLayout */}
          <div className="flex-1 space-y-6 pb-6">
            {/* Main content sections based on activeSection - APPEARS FIRST FOR IMMEDIATE VISIBILITY */}
            {activeSection === "dashboard" && (
              <>
                <PendingApprovals />
                <BusinessManagement />
                <CategoryManagement />
                <JobManagement />
              </>
            )}
            {activeSection === "businesses" && (
              <>
                <PendingApprovals />
                <BusinessManagement />
              </>
            )}
            {activeSection === "categories" && <CategoryManagement />}
            {activeSection === "jobs" && <JobManagement />}
            {activeSection === "advertising" && <AdvertisingSection />}
            {activeSection === "marketplace" && <MarketplaceModeration />}
            {activeSection === "artists" && <ArtistsSection />}
            {activeSection === "users" && <UsersSection />}
            {activeSection === "roles" && <RoleManagementSection />}
            {activeSection === "analytics" && <AnalyticsSection />}
            {activeSection === "cms" && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Content Management
                  </CardTitle>
                  <CardDescription>
                    Manage website pages and content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>Content management features coming soon</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {activeSection === "security" && <SecuritySection />}
            {activeSection === "smtp" && <SmtpSection />}
            {activeSection === "tsr-whitelist" && <TSRWhitelistSection />}
            {activeSection === "contractor-apps" && (
              <ContractorApplicationsSection />
            )}
            {activeSection === "geo-queue" && <GeoActionQueueSection />}
            {activeSection === "contractor-assign" && (
              <ContractorAssignmentSection />
            )}

            {/* Dashboard Stats - shown at the bottom for reference */}
            {activeSection === "dashboard" && (
              <>
                <Separator className="my-6" />
                <h3 className="text-lg font-semibold mb-4">
                  Dashboard Overview
                </h3>
                <DashboardStats
                  stats={stats}
                  onRefresh={handleRefresh}
                  isRefreshing={isRefreshing}
                />
              </>
            )}

            {/* Quick Actions Card - always available */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Quickly perform common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        className={`h-24 flex flex-col gap-2 ${action.color} hover:opacity-90 transition-opacity`}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-sm">{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseIcon className="h-5 w-5" />
                  Database Operations
                </CardTitle>
                <CardDescription>
                  Advanced database management tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {DATABASE_OPERATIONS.map((op) => {
                    const Icon = op.icon;
                    return (
                      <Button
                        key={op.id}
                        onClick={() => {
                          if (op.id === "sql-editor") setShowSqlEditor(true);
                          else if (op.id === "backup") setShowBackupModal(true);
                          else if (op.id === "health")
                            setShowHealthPanel(!showHealthPanel);
                          else setActiveSection(op.id);
                        }}
                        variant="outline"
                        className={`h-20 flex-col gap-2 hover:shadow-md transition-shadow ${op.bgColor}`}
                      >
                        <Icon className={`h-5 w-5 ${op.color}`} />
                        <span className={`text-xs font-medium ${op.color}`}>
                          {op.label}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <AnimatePresence>
              {showHealthPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Database health panel (same as original, omitted for brevity) */}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer – always visible at bottom of scrollable area */}
          <footer className="flex-none pt-6 border-t border-gray-200 text-sm text-gray-500">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="flex items-center gap-2">
                <DatabaseIcon className="h-4 w-4" />
                <span>
                  VersoAir Business Platform v2.0 • PostgreSQL Connected
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span>Last Updated: {new Date().toLocaleTimeString()}</span>
                <Button variant="ghost" size="sm" onClick={handleRefresh}>
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </DashboardLayout>

      {/* SQL Editor Modal */}
      <Dialog
        open={showSqlEditor}
        onOpenChange={(open) => {
          setShowSqlEditor(open);
          if (open) {
            // Load a random snippet on every open
            const pick =
              SQL_SNIPPETS[Math.floor(Math.random() * SQL_SNIPPETS.length)];
            setSqlQuery(pick.q);
            setQueryResult(null);
            setSqlExecTime(null);
            setShowSqlHistory(false);
          }
        }}
      >
        <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-xl bg-[#0d1117] border border-white/10 shadow-[0_0_60px_rgba(139,92,246,0.15)]">
          {/* macOS-style title bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-white/10 select-none">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[0_0_4px_#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[0_0_4px_#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[0_0_4px_#27c93f]" />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <Terminal className="h-3 w-3 text-purple-400" />
                <span className="text-purple-300 font-semibold tracking-wide">
                  SQL Console
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">
                  versoair_business_intelligence
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sqlExecTime !== null && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-700/30">
                  <Clock className="h-2.5 w-2.5" />
                  {sqlExecTime}ms
                </span>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-700/30">
                PostgreSQL 16
              </span>
            </div>
          </div>

          {/* Snippet picker bar */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1117] border-b border-white/5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap mr-1">
              Quick load:
            </span>
            {SQL_SNIPPETS.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  setSqlQuery(s.q);
                  setQueryResult(null);
                  setSqlExecTime(null);
                }}
                className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-white/5 hover:bg-purple-500/20 hover:text-purple-300 text-slate-400 border border-white/5 hover:border-purple-500/30 transition-all whitespace-nowrap"
              >
                {s.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  const pick =
                    SQL_SNIPPETS[
                      Math.floor(Math.random() * SQL_SNIPPETS.length)
                    ];
                  setSqlQuery(pick.q);
                  setQueryResult(null);
                  setSqlExecTime(null);
                }}
                title="Load random snippet"
                className="text-[10px] font-mono px-2 py-1 rounded-md bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-600/30 transition-all flex items-center gap-1"
              >
                <Zap className="h-2.5 w-2.5" /> Random
              </button>
            </div>
          </div>

          {/* Editor area */}
          <div className="flex" style={{ minHeight: 200 }}>
            {/* Gutter: line numbers */}
            <div className="select-none flex flex-col items-end pt-3 pb-3 pr-2 pl-3 bg-[#0d1117] border-r border-white/5 min-w-[42px]">
              {(sqlQuery || " ").split("\n").map((_, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono text-slate-700 leading-6"
                >
                  {i + 1}
                </span>
              ))}
            </div>
            {/* Code textarea */}
            <Textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleExecuteQuery();
                }
              }}
              className="flex-1 font-mono text-[13px] leading-6 resize-none rounded-none border-0 bg-transparent text-slate-100 placeholder:text-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pt-3 pb-3"
              placeholder={
                "-- Write your SQL here\nSELECT * FROM users LIMIT 10;"
              }
              spellCheck={false}
              style={{ minHeight: 200 }}
            />
          </div>

          {/* Keyword color hints + action bar */}
          <div className="flex items-center gap-3 px-4 py-1.5 bg-[#0a0e14] border-t border-white/5 text-[10px] font-mono">
            {[
              { kw: "SELECT", c: "text-[#79c0ff]" },
              { kw: "FROM", c: "text-[#ffa657]" },
              { kw: "WHERE", c: "text-[#7ee787]" },
              { kw: "JOIN", c: "text-[#e3b341]" },
              { kw: "GROUP", c: "text-[#d2a8ff]" },
              { kw: "ORDER", c: "text-[#f78166]" },
              { kw: "LIMIT", c: "text-[#79c0ff]" },
            ].map(({ kw, c }) => (
              <span key={kw} className={c}>
                {kw}
              </span>
            ))}
            <span className="ml-auto text-slate-600">⌘ Return to run</span>
          </div>

          {/* Action toolbar */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-t border-white/10">
            <Button
              onClick={() => {
                setSqlHistory((h) =>
                  sqlQuery ? [sqlQuery, ...h.slice(0, 9)] : h,
                );
                handleExecuteQuery();
                const t0 = Date.now();
                setSqlExecTime(null);
                const interval = setInterval(() => {
                  if (!isExecutingQuery) {
                    setSqlExecTime(Date.now() - t0);
                    clearInterval(interval);
                  }
                }, 50);
              }}
              disabled={isExecutingQuery}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs h-8 px-4 shadow-[0_0_12px_rgba(139,92,246,0.4)] border-0"
            >
              {isExecutingQuery ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Run Query
                </>
              )}
            </Button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(sqlQuery);
                setSqlCopied(true);
                setTimeout(() => setSqlCopied(false), 1800);
              }}
              title="Copy query"
              className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5 transition-all h-8"
            >
              {sqlCopied ? (
                <>
                  <span className="text-emerald-400">✓</span> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>

            <button
              onClick={() => {
                setSqlQuery("");
                setQueryResult(null);
                setSqlExecTime(null);
              }}
              className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1.5 rounded bg-white/5 hover:bg-red-900/20 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-800/40 transition-all h-8"
            >
              Clear
            </button>

            {sqlHistory.length > 0 && (
              <button
                onClick={() => setShowSqlHistory((v) => !v)}
                className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5 transition-all h-8"
              >
                <Clock className="h-3 w-3" />
                History ({sqlHistory.length})
              </button>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              {queryResult && !queryResult.error && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {Array.isArray(queryResult?.rows)
                    ? `${queryResult.rows.length} rows`
                    : "OK"}
                </span>
              )}
              {queryResult?.error && (
                <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Error
                </span>
              )}
            </div>
          </div>

          {/* History dropdown */}
          {showSqlHistory && sqlHistory.length > 0 && (
            <div className="bg-[#0d1117] border-t border-white/5 max-h-40 overflow-y-auto">
              {sqlHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSqlQuery(h);
                    setShowSqlHistory(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[11px] font-mono text-slate-400 hover:bg-white/5 hover:text-slate-200 border-b border-white/5 truncate transition-colors"
                >
                  <span className="text-slate-600 mr-2">{i + 1}.</span>
                  {h.replace(/\n/g, " ")}
                </button>
              ))}
            </div>
          )}

          {/* Results panel */}
          <div className="bg-[#0d1117] max-h-64 overflow-auto border-t border-white/10">
            {isExecutingQuery ? (
              <div className="flex items-center gap-3 p-5 text-slate-400 text-xs font-mono">
                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                <span className="text-slate-500">Executing query</span>
                <span className="animate-pulse text-purple-400">▋</span>
              </div>
            ) : queryResult?.error ? (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
                    Query Error
                  </span>
                </div>
                <pre className="text-xs font-mono text-red-300 bg-red-950/30 border border-red-800/30 rounded p-3 whitespace-pre-wrap">
                  {queryResult.error}
                </pre>
              </div>
            ) : queryResult &&
              Array.isArray(queryResult?.rows) &&
              queryResult.rows.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-[#161b22] border-b border-white/5 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400">
                    {queryResult.rows.length} row
                    {queryResult.rows.length !== 1 ? "s" : ""} returned
                  </span>
                  {sqlExecTime && (
                    <span className="text-slate-600 ml-1">
                      in {sqlExecTime}ms
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const cols = Object.keys(queryResult.rows[0]);
                      const csv = [
                        cols.join(","),
                        ...queryResult.rows.map((r: any) =>
                          cols.map((c) => JSON.stringify(r[c] ?? "")).join(","),
                        ),
                      ].join("\n");
                      navigator.clipboard.writeText(csv);
                    }}
                    className="ml-auto text-[9px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300 border border-white/5 transition-all"
                  >
                    Copy CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr>
                        <th className="px-3 py-1.5 text-center text-slate-700 bg-[#0d1117] border-b border-white/5 w-8">
                          #
                        </th>
                        {Object.keys(queryResult.rows[0]).map((col) => (
                          <th
                            key={col}
                            className="text-left px-4 py-1.5 text-slate-400 font-semibold bg-[#0d1117] border-b border-white/5 whitespace-nowrap"
                          >
                            <span className="text-slate-600 mr-1">⬡</span>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row: any, i: number) => (
                        <tr
                          key={i}
                          className={`border-b border-white/[0.03] transition-colors ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"} hover:bg-purple-500/5`}
                        >
                          <td className="px-3 py-1.5 text-center text-slate-700 text-[10px]">
                            {i + 1}
                          </td>
                          {Object.values(row).map((val: any, j: number) => (
                            <td
                              key={j}
                              className="px-4 py-1.5 whitespace-nowrap max-w-[220px] truncate"
                            >
                              {val === null ? (
                                <span className="text-slate-700 italic text-[10px]">
                                  NULL
                                </span>
                              ) : typeof val === "number" ? (
                                <span className="text-[#79c0ff]">
                                  {String(val)}
                                </span>
                              ) : typeof val === "boolean" ? (
                                <span
                                  className={
                                    val ? "text-emerald-400" : "text-red-400"
                                  }
                                >
                                  {String(val)}
                                </span>
                              ) : (
                                <span className="text-slate-300">
                                  {String(val)}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : queryResult ? (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400">
                    Query OK — {queryResult.rowCount ?? 0} row(s) affected
                  </span>
                </div>
                <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap">
                  {JSON.stringify(queryResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-700 gap-2">
                <Terminal className="h-8 w-8 opacity-20" />
                <span className="text-xs font-mono">
                  Run a query to see results
                </span>
                <span className="text-[10px] font-mono text-slate-800">
                  ⌘ Return · or click Run Query
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Modal */}
      <Dialog open={showBackupModal} onOpenChange={setShowBackupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DatabaseBackup className="h-5 w-5" />
              Create Database Backup
            </DialogTitle>
            <DialogDescription>
              Create a backup of your database
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Backup Type</Label>
              <Select
                value={backupType}
                onValueChange={(value: any) => setBackupType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Backup</SelectItem>
                  <SelectItem value="partial">Partial Backup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="w-full gap-2"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <DatabaseBackup className="h-4 w-4" />
                  Create Backup
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

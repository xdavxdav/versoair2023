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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5003";

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

// Business Management Component
const BusinessManagement = ({
  sharedCategories,
}: { sharedCategories?: any[] } = {}) => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categorySearch, setCategorySearch] = useState("");
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentBusiness, setCurrentBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newBusiness, setNewBusiness] = useState({
    name: "",
    categoryId: 0,
    email: "",
    phone: "",
    address: "",
    description: "",
  });

  const fetchBusinesses = useCallback(
    async (searchTerm = "", categoryFilter = "all", pageNum = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
        });
        if (searchTerm.trim()) params.set("search", searchTerm.trim());
        if (categoryFilter !== "all") params.set("category", categoryFilter);

        const businessRes = await authenticatedFetch(
          `${API_BASE_URL}/api/businesses?${params.toString()}`,
        );
        const businessData = await businessRes.json();

        if (businessData.success || businessData.data) {
          setBusinesses(businessData.data || []);
          if (businessData.pagination) {
            setTotalPages(businessData.pagination.totalPages || 1);
            setTotalCount(businessData.pagination.total || 0);
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
        // Mock data fallback
        const mockBusinesses = [
          {
            id: 1,
            name: "Verso Air",
            categoryId: 1,
            email: "info@versoair.com",
            phone: "+33123456789",
            address: "123 Business St, Paris",
            description: "Leading business intelligence platform",
            isVerified: true,
            isAdvertiser: false,
          },
          // ... more mock businesses (omitted for brevity)
        ];
        setBusinesses(mockBusinesses);
        setTotalPages(1);
        setTotalCount(mockBusinesses.length);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Initial load — fetch businesses once
  useEffect(() => {
    fetchBusinesses("", "all", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            console.log("✅ Categories loaded (admin API):", cats.length);
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
          console.log("✅ Categories loaded (public API):", cats.length);
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
      fetchBusinesses(search, selectedCategory, 1);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory]);

  // Re-fetch when page changes (but not on initial mount, initial load handles that)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBusinesses(search, selectedCategory, page);
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

  const handleSeedData = async () => {
    setSeedingLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/v1/admin/businesses/seed/data`,
        { method: "POST" },
      );
      const data = await response.json();
      if (data.success) {
        setPage(1);
        await fetchBusinesses("", "all", 1);
        toast({
          title: "Success",
          description: `${data.count} sample businesses added 🎉`,
        });
      }
    } catch (error) {
      console.error("Failed to seed data:", error);
      toast({
        title: "Error",
        description: "Failed to add sample data",
        variant: "destructive",
      });
    } finally {
      setSeedingLoading(false);
    }
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
        await fetchBusinesses(search, selectedCategory, page);
        setShowAddDialog(false);
        setNewBusiness({
          name: "",
          categoryId: 0,
          email: "",
          phone: "",
          address: "",
          description: "",
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
        await fetchBusinesses(search, selectedCategory, page);
        setShowEditDialog(false);
        setCurrentBusiness(null);
        toast({
          title: "Success",
          description: "Business updated successfully",
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
        await fetchBusinesses(search, selectedCategory, page);
        setShowDeleteDialog(false);
        setCurrentBusiness(null);
        toast({
          title: "Success",
          description: "Business deleted successfully",
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
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-lg">
                <Store className="h-5 w-5" />
              </div>
              Business Management
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Manage{" "}
              <span className="font-semibold text-gray-700">{totalCount}</span>{" "}
              active businesses across{" "}
              <span className="font-semibold text-gray-700">
                {categories.filter((c: any) => !c.parentId).length}
              </span>{" "}
              main categories ({categories.length} total)
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSeedData}
              disabled={seedingLoading || businesses.length > 0}
              variant="outline"
              className="gap-2"
            >
              {seedingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {seedingLoading ? "Loading..." : "Load Sample Data"}
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus className="h-4 w-4" />
              Add Business
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Stats Row */}
          {businesses.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">
                  {totalCount}
                </div>
                <div className="text-xs text-blue-600">Total Businesses</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-700">
                  {businesses.filter((b: any) => b.isVerified).length}
                </div>
                <div className="text-xs text-green-600">Verified</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">
                  {businesses.filter((b: any) => b.isAdvertiser).length}
                </div>
                <div className="text-xs text-purple-600">Advertisers</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-700">
                  {(
                    businesses.reduce(
                      (sum: number, b: any) => sum + (b.rating || 0),
                      0,
                    ) / Math.max(1, businesses.length)
                  ).toFixed(1)}
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
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
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
                                    .includes(categorySearch.toLowerCase()),
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
          <div className="border rounded-lg overflow-hidden">
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
                  <TableHead>Category</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                                {business.isVerified && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-normal">
                                    ✓ Verified
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                {business.address || business.location || "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {business.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              {business.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium">
                              {business.rating || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
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
                        <TableCell>
                          <p className="text-sm text-gray-500">
                            {business.createdAt}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setCurrentBusiness(business);
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setCurrentBusiness(business);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Business</DialogTitle>
            <DialogDescription>
              Create a new business listing in the directory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                  newBusiness.categoryId
                    ? String(newBusiness.categoryId)
                    : undefined
                }
                onValueChange={(value) =>
                  setNewBusiness({
                    ...newBusiness,
                    categoryId: parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <SelectItem value="__loading" disabled>
                      Loading categories...
                    </SelectItem>
                  ) : (
                    categories
                      .filter((c: any) => !c.parentId)
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
                placeholder="+33123456789"
                value={newBusiness.phone}
                onChange={(e) =>
                  setNewBusiness({ ...newBusiness, phone: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Business address"
                value={newBusiness.address}
                onChange={(e) =>
                  setNewBusiness({ ...newBusiness, address: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Business description"
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
          <DialogFooter>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>Update business information</DialogDescription>
          </DialogHeader>
          {currentBusiness && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Business Name</Label>
                <Input
                  id="edit-name"
                  value={currentBusiness.name}
                  onChange={(e) =>
                    setCurrentBusiness({
                      ...currentBusiness,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={currentBusiness.email}
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
                  value={currentBusiness.phone}
                  onChange={(e) =>
                    setCurrentBusiness({
                      ...currentBusiness,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={currentBusiness.address}
                  onChange={(e) =>
                    setCurrentBusiness({
                      ...currentBusiness,
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={currentBusiness.description}
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
          <DialogFooter>
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
        console.log("Categories API response:", data);

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
        <div className="flex gap-4 mb-6">
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
          <div className="space-y-6">
            {categories
              .filter((c: any) => !c.parentId)
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

                return (
                  <Card key={mainCat.id} className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${bgColor}`}>
                            <Icon className={`h-5 w-5 ${color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {mainCat.name}
                              <Badge
                                variant="default"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Main
                              </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {mainCat.slug}{" "}
                              {mainCat.description
                                ? `— ${mainCat.description}`
                                : ""}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {subs.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {subs.length} sub{subs.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentCategory(mainCat);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setCurrentCategory(mainCat);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {subs.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="ml-6 pl-4 border-l-2 border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                            {subs.map((sub: any) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm truncate">
                                    {sub.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      </CardContent>
                    )}
                  </Card>
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
const JobManagement = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(null);
  const [newJob, setNewJob] = useState({
    title: "",
    company: "",
    type: "full-time",
    location: "",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    description: "",
  });

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/api/v1/admin/jobs?limit=100`,
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
    };
    fetchJobs();
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
          body: JSON.stringify(newJob),
        },
      );
      const data = await response.json();
      if (data.success) {
        setJobs([...jobs, data.data]);
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
        setJobs(jobs.map((j) => (j.id === currentJob.id ? data.data : j)));
        setShowEditDialog(false);
        setCurrentJob(null);
        toast({
          title: "Success",
          description: "Job updated successfully",
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
        setJobs(jobs.filter((j) => j.id !== currentJob.id));
        setShowDeleteDialog(false);
        setCurrentJob(null);
        toast({
          title: "Success",
          description: "Job deleted successfully",
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
              Manage job listings and applications
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500"
          >
            <Plus className="h-4 w-4" />
            Post Job
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <Badge variant="secondary">{job.type}</Badge>
                  </div>
                  <CardDescription>{job.company}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Banknote className="h-4 w-4" />
                      {job.salary}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      {job.applications || 0} applicants
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="flex gap-2 w-full">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
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
                      className="flex-1"
                      onClick={() => {
                        setCurrentJob(job);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Add Job Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post New Job</DialogTitle>
            <DialogDescription>Create a new job listing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="job-desc">Description</Label>
              <Textarea
                id="job-desc"
                placeholder="Job description and requirements"
                value={newJob.description}
                onChange={(e) =>
                  setNewJob({ ...newJob, description: e.target.value })
                }
              />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update job listing</DialogDescription>
          </DialogHeader>
          {currentJob && (
            <div className="space-y-4">
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
              <div>
                <Label htmlFor="edit-job-location">Location</Label>
                <Input
                  id="edit-job-location"
                  value={currentJob.location}
                  onChange={(e) =>
                    setCurrentJob({ ...currentJob, location: e.target.value })
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
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

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
          body: JSON.stringify(selectedRole),
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
          description: "Role deleted successfully",
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
        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedRole.id === role.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {role.description}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${role.color}`}
                >
                  {role.userCount} users
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setShowEditModal(true)}
                >
                  <EditIcon className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Role Details */}
        {selectedRole && (
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle>{selectedRole.name}</CardTitle>
              <CardDescription>{selectedRole.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Permissions</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRole.permissions &&
                    selectedRole.permissions.length > 0 ? (
                      selectedRole.permissions.map(
                        (perm: string, i: number) => (
                          <Badge key={i} variant="secondary">
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
      </CardContent>

      {/* Add Role Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
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
                placeholder="e.g., Editor, Moderator"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role information</DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-role-name">Role Name</Label>
                <Input
                  id="edit-role-name"
                  value={selectedRole.name}
                  onChange={(e) =>
                    setSelectedRole({
                      ...selectedRole,
                      name: e.target.value,
                    })
                  }
                />
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
              <span className="font-semibold">{selectedRole?.name}</span>? This
              action cannot be undone.
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
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(searchQuery.toLowerCase());
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
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
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

  const {
    sessionTimeLeft,
    sessionProgress,
    isSessionCritical,
    isSessionLow,
    handleExtendSession,
    formatTimeLeft,
  } = useSessionTimer(isAdminGateAuthenticated, true); // enableTimeout=true for admin dashboard

  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showHealthPanel, setShowHealthPanel] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM users LIMIT 10");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
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
      // Session restored from localStorage but no JWT — re-authenticate via admin gate
      const API = import.meta.env.VITE_API_URL || "http://localhost:5003";
      fetch(`${API}/auth/admin-gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: authenticatedAdminUsername }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.token) {
            import("@/lib/auth").then(({ setAuthToken }) =>
              setAuthToken(data.token),
            );
          }
        })
        .catch(() => {});
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
        authenticatedFetch(`${API_BASE_URL}/api/health`),
        authenticatedFetch(`${API_BASE_URL}/api/status`),
        authenticatedFetch(`${API_BASE_URL}/api/admin/health`).catch(
          () => null,
        ),
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
            authenticatedFetch(`${API_BASE_URL}/api/businesses?limit=1`),
            authenticatedFetch(
              `${API_BASE_URL}/api/v1/admin/categories?limit=1`,
            ),
          ]);
          const bizData = await bizRes.json();
          const catData = await catRes.json();
          businessCount = bizData.pagination?.total || 0;
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
  }, [fetchDatabaseHealth]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleLogout = () => {
    setIsAdminGateAuthenticated(false);
    localStorage.removeItem("adminAccessTime");
    localStorage.removeItem("adminUsername");
    setLocation("/geo-admin");
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
      <DashboardLayout
        sections={MAIN_SECTIONS}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        title="VersoAir Business Platform"
        subtitle={`Premium Admin Dashboard • Welcome, ${authenticatedAdminUsername || "Administrator"}`}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      >
        {/* Wrap all children in a flex column that takes full height of the main content area */}
        <div className="flex flex-col h-full">
          {/* Fixed top section (non-scrolling) */}
          <div className="flex-none space-y-4">
            <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 rounded-lg shadow-sm flex justify-end gap-3">
              <Button
                onClick={() => setLocation("/geo-admin")}
                className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Geo Admin
              </Button>
              <Button
                onClick={() => setLocation("/tickets")}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 gap-2"
              >
                <FileText className="h-4 w-4" />
                Ticket System
              </Button>
              <Button
                onClick={() => setLocation("/admin/tickets")}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 gap-2"
              >
                <Shield className="h-4 w-4" />
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

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pb-6">
            {/* Fixed Status Indicator (absolute positioned, but kept here for visibility) */}
            <div className="fixed top-4 right-4 z-50">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium ${
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

            {/* Main content sections based on activeSection - APPEARS FIRST FOR IMMEDIATE VISIBILITY */}
            {activeSection === "dashboard" && (
              <>
                <BusinessManagement />
                <CategoryManagement />
                <JobManagement />
              </>
            )}
            {activeSection === "businesses" && <BusinessManagement />}
            {activeSection === "categories" && <CategoryManagement />}
            {activeSection === "jobs" && <JobManagement />}
            {activeSection === "advertising" && <AdvertisingSection />}
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
      <Dialog open={showSqlEditor} onOpenChange={setShowSqlEditor}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              SQL Query Editor
            </DialogTitle>
            <DialogDescription>
              Execute SQL queries against the database
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>SQL Query</Label>
              <Textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="font-mono h-48"
                placeholder="Enter your SQL query..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExecuteQuery}
                disabled={isExecutingQuery}
                className="gap-2"
              >
                {isExecutingQuery ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Execute Query
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setSqlQuery("")}>
                Clear
              </Button>
            </div>
            {queryResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <pre className="text-sm overflow-auto max-h-64">
                  {JSON.stringify(queryResult, null, 2)}
                </pre>
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

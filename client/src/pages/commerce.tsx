import { useQuery } from "@tanstack/react-query";
import {
  searchBusinesses,
  checkDatabaseConnection,
  Business,
} from "@/lib/business-data";
/* webhint-disable hint-no-inline-styles */
import { useEffect, useRef, useState, useCallback } from "react";
import AnalyticsCard from "@/components/ui/analytics-card";
import ProgressBar from "@/components/ui/progress-bar";
import AnimatedHeading from "@/components/AnimatedHeading";
import AnimatedKeyboardText from "@/components/AnimatedKeyboardText";
import { AnimatedButton } from "@/components/AnimatedButton";
import {
  Search,
  Filter,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Star,
  MapPin,
  Globe,
  BarChart3,
  CreditCard,
  Store,
  Package,
  Truck,
  DollarSign,
  Target,
  Megaphone,
  Eye,
  Heart,
  Phone,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Tag,
  CheckCircle,
  X,
  Building,
  Database,
  Activity,
  ExternalLink,
  Briefcase,
  Sparkles,
  Users as UsersIcon,
  Check,
  ChevronRight,
  ChevronDown,
  Loader2,
  BarChart,
  TrendingDown,
  Edit,
  ShieldCheck,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ScrollToTop from "@/components/ScrollToTop";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsModal } from "@/components/SettingsModal";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useCountry } from "@/contexts/CountryContext";
import SectorBusinessCard from "@/components/SectorBusinessCard";

// Database API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Commerce types
interface CommerceAnalytics {
  total_revenue: number;
  total_ads: number;
  total_businesses: number;
  average_rating: number;
  average_ctr: number;
  average_roi: number;
  year_over_year_growth: number;
  top_categories: Array<{
    category: string;
    revenue: number;
    ads_count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    revenue: number;
    ads_published: number;
  }>;
  top_regions: Array<{ region: string; revenue: number; percentage: number }>;
  platform_stats: Array<{
    platform: string;
    ads_count: number;
    avg_ctr: number;
  }>;
}

// Updated search function for commerce endpoint
async function searchCommerceBusinesses(params: {
  query?: string;
  category?: string;
  location?: string;
  min_rating?: number;
  business_type?: string;
  min_price?: number;
  max_price?: number;
  status?: string;
  platforms?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  countryCode?: string;
}): Promise<Business[]> {
  try {
    const queryParams = new URLSearchParams();

    // Add all parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });

    // Search within Commerce sector pool (parent category ID 4 — Supermarkets, Hardware, Retail)
    const results = await searchBusinesses({
      query: params.query,
      sectorId: 4,
      location: params.location,
      countryCode: params.countryCode,
      limit: params.limit || 50,
    });
    return results;
  } catch (error) {
    console.error("Search failed:", error);
    return []; // Return empty array on error
  }
}

async function fetchCommerceAnalytics(): Promise<CommerceAnalytics> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/commerce`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch commerce analytics:", error);
    // Return mock data for development
    return {
      total_revenue: 4250000,
      total_ads: 2850,
      total_businesses: 1240,
      average_rating: 4.6,
      average_ctr: 5.2,
      average_roi: 4.2,
      year_over_year_growth: 18,
      top_categories: [
        { category: "electronics", revenue: 1254000, ads_count: 420 },
        { category: "fashion", revenue: 892000, ads_count: 385 },
        { category: "food", revenue: 568000, ads_count: 298 },
        { category: "technology", revenue: 423000, ads_count: 245 },
        { category: "real-estate", revenue: 287000, ads_count: 198 },
      ],
      monthly_trends: [
        { month: "Jan", revenue: 320000, ads_published: 210 },
        { month: "Feb", revenue: 350000, ads_published: 235 },
        { month: "Mar", revenue: 380000, ads_published: 255 },
        { month: "Apr", revenue: 410000, ads_published: 280 },
        { month: "May", revenue: 440000, ads_published: 300 },
        { month: "Jun", revenue: 480000, ads_published: 325 },
      ],
      top_regions: [
        { region: "Europe", revenue: 1985200, percentage: 41 },
        { region: "North America", revenue: 1763400, percentage: 32 },
        { region: "Asia Pacific", revenue: 1432100, percentage: 18 },
        { region: "Africa", revenue: 6219300, percentage: 9 },
      ],
      platform_stats: [
        { platform: "Web", ads_count: 1200, avg_ctr: 4.8 },
        { platform: "Mobile", ads_count: 950, avg_ctr: 5.6 },
        { platform: "Social", ads_count: 700, avg_ctr: 6.2 },
      ],
    };
  }
}

async function testDatabaseConnection(): Promise<{
  success: boolean;
  database?: { connected: boolean; database?: string };
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Database connection test failed:", error);
    return { success: false };
  }
}

// Category options will be loaded dynamically from the backend via `/api/business/categories` and `/api/admin/category-stats`.
// The `categoryOptions` array is computed inside the component so it can include counts and parent/child relationships.

const businessTypeOptions = [
  { value: "retail", label: "Commerce de détail" },
  { value: "service", label: "Service" },
  { value: "manufacturing", label: "Fabrication" },
  { value: "restaurant", label: "Restaurant" },
  { value: "ecommerce", label: "E-commerce" },
];

const statusOptions = [
  { value: "active", label: "Actif" },
  { value: "verified", label: "Vérifié" },
  { value: "premium", label: "Premium" },
  { value: "pending", label: "En attente" },
  { value: "paused", label: "En pause" },
];

type TabType = "analytics" | "businesses" | "finance" | "ads" | "database";

export default function CommerceBusinessAds() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstanceRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("businesses");
  const [dateRange, setDateRange] = useState("last_30_days");
  const [showFilters, setShowFilters] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const { selectedCountry } = useCountry();
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [activeFilters, setActiveFilters] = useState({
    category: "",
    business_type: "",
    minRating: "",
    minPrice: "",
    maxPrice: "",
    status: "",
    sort_by: "rating_desc",
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  useScrollLock(showBusinessDetails);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load categories and stats from the server
  const {
    data: categoriesRes,
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/business/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      return json.categoryData || json.categories || [];
    },
    staleTime: 60_000,
  });

  const { data: categoryStats } = useQuery({
    queryKey: ["category-stats"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/category-stats`);
      if (!res.ok) throw new Error("Failed to fetch category stats");
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 60_000,
  });

  // Build a category options list combining parent/child and counts
  const categoryOptions = ((): Array<{ value: string; label: string }> => {
    const stats = Array.isArray(categoryStats) ? categoryStats : [];
    const cats = Array.isArray(categoriesRes) ? categoriesRes : [];

    // Map stats by id for counts/parent relationships
    const statsById = new Map<number, any>();
    stats.forEach((s: any) => statsById.set(s.id, s));

    // Map categories by id for name resolution
    const catsById = new Map<number, any>();
    cats.forEach((c: any) => catsById.set(c.id, c));

    // Build parent => children mapping
    const parents: any[] = [];
    const childrenByParent = new Map<number, any[]>();

    stats.forEach((s: any) => {
      if (!s.parent_id) {
        parents.push(s);
      } else {
        const arr = childrenByParent.get(s.parent_id) || [];
        arr.push(s);
        childrenByParent.set(s.parent_id, arr);
      }
    });

    // Sort parents alphabetically
    parents.sort((a: any, b: any) => a.name.localeCompare(b.name));

    const options: Array<{ value: string; label: string }> = [];

    // Add parent categories and their children (indented labels)
    parents.forEach((p: any) => {
      const parentCount = p.businesses_count || 0;
      options.push({
        value: p.name,
        label: `${p.name} (${parentCount})`,
      });

      const children = childrenByParent.get(p.id) || [];
      children
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .forEach((c: any) => {
          const childCount = c.businesses_count || 0;
          const childName = (catsById.get(c.id) || c).name || c.name;
          options.push({
            value: childName,
            label: `↳ ${childName} (${childCount})`,
          });
        });
    });

    // If there were categories returned that didn't appear in stats (edge cases), add them
    cats.forEach((c: any) => {
      if (!statsById.has(c.id)) {
        options.push({ value: c.name, label: `${c.name} (0)` });
      }
    });

    return options;
  })();

  // Database connection test
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testDatabaseConnection();
      const connected = result.success === true;
      setDatabaseConnected(connected);
    };
    checkConnection();
  }, []);

  // Fetch commerce analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["commerce-analytics"],
    queryFn: fetchCommerceAnalytics,
    refetchInterval: autoRefresh ? 300000 : false,
    staleTime: 60000,
  });

  // Fetch initial commerce businesses
  const fetchBusinesses = useCallback(async () => {
    setIsInitialLoading(true);

    try {
      const businesses = await searchCommerceBusinesses({
        query: "",
        business_type: "retail,service,restaurant",
        countryCode: selectedCountry || undefined,
        limit: 9,
        sort_by: activeFilters.sort_by,
      });

      setSearchResults(businesses);
      setTotalResults(businesses.length);
      setHasSearched(true);
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsInitialLoading(false);
    }
  }, [activeFilters.sort_by, selectedCountry]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Debounced search - auto-fetch after user stops typing
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    // Only trigger if user has typed something
    if (
      searchQuery.trim() ||
      locationQuery.trim() ||
      Object.values(activeFilters).some((f) => f && f !== "rating_desc")
    ) {
      searchTimerRef.current = setTimeout(() => {
        handleSearch(1);
      }, 300);
    }

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, locationQuery, selectedCountry, activeFilters]);

  // Search handler
  const handleSearch = async (page: number = 1) => {
    setIsSearching(true);
    setCurrentPage(page);

    try {
      const params: any = {
        query: searchQuery,
        business_type: "retail,service,restaurant,manufacturing,ecommerce",
        limit: 9,
        page: page,
        sort_by: activeFilters.sort_by,
      };

      if (locationQuery) params.location = locationQuery;
      if (selectedCountry) params.countryCode = selectedCountry;
      if (activeFilters.category) params.category = activeFilters.category;
      if (activeFilters.business_type)
        params.business_type = activeFilters.business_type;
      if (activeFilters.minRating)
        params.min_rating = parseFloat(activeFilters.minRating);
      if (activeFilters.minPrice)
        params.min_price = parseInt(activeFilters.minPrice);
      if (activeFilters.maxPrice)
        params.max_price = parseInt(activeFilters.maxPrice);
      if (activeFilters.status) params.status = activeFilters.status;

      const businesses = await searchCommerceBusinesses(params);

      setSearchResults(businesses);
      setTotalResults(businesses.length);
      setHasSearched(true);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({
      category: "",
      business_type: "",
      minRating: "",
      minPrice: "",
      maxPrice: "",
      status: "",
      sort_by: "rating_desc",
    });
    setSearchQuery("");
    setLocationQuery("");
    fetchBusinesses();
  };

  // Carousel state with images
  const [enterprises, setEnterprises] = useState<
    Array<{
      name: string;
      desc: string;
      image: string;
      rating?: number;
      location?: string;
      type?: string;
    }>
  >([
    {
      name: "Loading businesses...",
      desc: "Connecting to commerce database",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Update carousel with database results
  useEffect(() => {
    if (searchResults.length > 0) {
      const featuredEnterprises = searchResults.slice(0, 8).map((business) => ({
        name: business.title,
        desc: business.description || "Premium commerce business",
        image: `https://images.unsplash.com/photo-${Math.floor(
          Math.random() * 1000,
        )}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80`,
        rating: business.rating,
        location: business.location,
        type: business.business_type,
      }));
      setEnterprises(
        featuredEnterprises.length > 0 ? featuredEnterprises : enterprises,
      );
    }
  }, [searchResults]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % enterprises.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [enterprises.length]);

  // Initialize charts
  useEffect(() => {
    if (chartRef.current && window.Chart && analytics?.monthly_trends) {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();

      const ctx = chartRef.current.getContext("2d");
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "hsla(270, 100%, 60%, 0.4)");
        gradient.addColorStop(1, "hsla(270, 100%, 60%, 0.05)");

        const labels = analytics.monthly_trends.map((t) => t.month);
        const revenueData = analytics.monthly_trends.map((t) => t.revenue || 0);
        const adsData = analytics.monthly_trends.map(
          (t) => t.ads_published || 0,
        );

        chartInstanceRef.current = new window.Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Revenue (€)",
                data: revenueData,
                borderColor: "hsl(270, 100%, 60%)",
                backgroundColor: gradient,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: "hsl(270, 100%, 60%)",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
              },
              {
                label: "Ads Published",
                data: adsData,
                borderColor: "hsl(330, 100%, 70%)",
                backgroundColor: "hsla(330, 100%, 70%, 0.1)",
                tension: 0.4,
                fill: false,
                pointBackgroundColor: "hsl(330, 100%, 70%)",
                borderDash: [5, 5],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, position: "top" },
              tooltip: {
                mode: "index",
                intersect: false,
                callbacks: {
                  label: function (context: any) {
                    return context.datasetIndex === 0
                      ? `€${context.raw.toLocaleString()}`
                      : `${context.raw.toLocaleString()} ads`;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: {
                  callback: function (value: any) {
                    return "€" + value.toLocaleString();
                  },
                },
              },
              x: { grid: { color: "rgba(255, 255, 255, 0.1)" } },
            },
          },
        });
      }
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [analytics]);

  // Initialize bar chart
  useEffect(() => {
    if (barChartRef.current && window.Chart && analytics?.top_categories) {
      if (barChartInstanceRef.current) barChartInstanceRef.current.destroy();

      const ctx = barChartRef.current.getContext("2d");
      if (ctx) {
        const labels = analytics.top_categories.map((c) => c.category);
        const data = analytics.top_categories.map((c) => c.revenue || 0);

        barChartInstanceRef.current = new window.Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Revenus par Catégorie (€)",
                data,
                backgroundColor: [
                  "hsla(270, 100%, 60%, 0.8)",
                  "hsla(270, 100%, 60%, 0.6)",
                  "hsla(270, 100%, 60%, 0.5)",
                  "hsla(270, 100%, 60%, 0.4)",
                  "hsla(270, 100%, 60%, 0.3)",
                ],
                borderColor: "hsl(270, 100%, 60%)",
                borderWidth: 1,
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: {
                  callback: function (value: any) {
                    return "€" + value.toLocaleString();
                  },
                },
              },
              x: { grid: { color: "rgba(255, 255, 255, 0.1)" } },
            },
          },
        });
      }
    }

    return () => {
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
        barChartInstanceRef.current = null;
      }
    };
  }, [analytics]);

  // Handle business selection
  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    setShowBusinessDetails(true);
  };

  // Commerce features
  const commerceFeatures = [
    {
      icon: <Database className="h-8 w-8" />,
      title: "Base de données PostgreSQL",
      description: "Données commerciales en direct depuis la base Verso Air",
    },
    {
      icon: <Store className="h-8 w-8" />,
      title: "Réseau d'entreprises",
      description: "Réseau mondial de commerces et services",
    },
    {
      icon: <ShoppingBag className="h-8 w-8" />,
      title: "E-commerce",
      description: "Solutions e-commerce complètes et intégrations",
    },
    {
      icon: <Megaphone className="h-8 w-8" />,
      title: "Publicité",
      description: "Campagnes publicitaires et marketing ciblées",
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Portée mondiale",
      description: "Entreprises dans plus de 50 pays",
    },
    {
      icon: <Activity className="h-8 w-8" />,
      title: "Analytique en direct",
      description: "Surveillance des performances en temps réel",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Database Connection Status */}
      <div
        className="fixed bottom-4 right-4 z-50"
        title={
          databaseConnected
            ? "Base de données connectée"
            : "Base de données hors ligne"
        }
      >
        <div
          className={`w-2.5 h-2.5 rounded-full ${databaseConnected ? "bg-green-500" : "bg-red-500"}`}
        />
      </div>

      {/* Hero + Carousel Container */}
      <div className="relative min-h-[100dvh] md:min-h-0 md:h-[600px] flex flex-col justify-center items-center text-center px-4 sm:px-6 overflow-hidden py-8 md:py-0">
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out`}
          /* webhint-disable-next-line hint-no-inline-styles */
          style={{
            backgroundImage: `url(${enterprises[currentIndex]?.image})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 to-pink-900/90"></div>
        </div>

        <div className="relative z-10 w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20">
              🛍️ Intelligence Commerciale
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-2xl"
          >
            Base de données Commerce & Affaires
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-[clamp(1rem,1.4vw,1.25rem)] mb-4 text-white/90"
          >
            Base de données PostgreSQL en temps réel avec{" "}
            {totalResults.toLocaleString()}+ commerces, détaillants & services
          </motion.p>

          {/* Database Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-[0.75vw] mb-[1.5vw]"
          >
            <Card className="bg-white/10 backdrop-blur-md border-blue-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-[0.5vw]">
                  <Database className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-blue-400" />
                  <span className="text-sm text-blue-200">
                    Base de Données en Direct
                  </span>
                </div>
                <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                  {totalResults.toLocaleString()}+ Enregistrements
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-md border-teal-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-[0.5vw]">
                  <Store className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-teal-400" />
                  <span className="text-sm text-teal-200">
                    Commerces & Détaillants
                  </span>
                </div>
                <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                  {searchResults.length} Chargés
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Auto-sliding enterprises */}
          <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-r from-blue-900/30 to-teal-900/30 backdrop-blur-md rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-blue-500/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      {[
                        ...Array(
                          Math.floor(enterprises[currentIndex]?.rating || 4),
                        ),
                      ].map((_, i) => (
                        <Star
                          key={i}
                          className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-blue-300">
                      {enterprises[currentIndex]?.name}
                    </h3>
                    <p className="text-gray-200 mt-2">
                      {enterprises[currentIndex]?.desc}
                    </p>
                    <div className="flex flex-wrap items-center gap-[0.5vw] sm:gap-[1vw] mt-3">
                      <div className="flex items-center gap-[0.5vw] text-blue-200">
                        <MapPin className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)]" />
                        <span>
                          {enterprises[currentIndex]?.location ||
                            "Emplacement non précisé"}
                        </span>
                      </div>
                      {enterprises[currentIndex]?.type && (
                        <div className="flex items-center gap-[0.5vw] text-teal-200">
                          <Tag className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)]" />
                          <span className="capitalize">
                            {enterprises[currentIndex]?.type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-blue-400" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] -mt-8 relative z-20">
        <Card className="bg-gradient-to-br from-slate-800/90 to-blue-900/90 backdrop-blur-md border-blue-700 shadow-2xl">
          <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
            <div className="flex flex-col md:flex-row items-center gap-[0.75vw] mb-[1vw]">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher commerces, détaillants, services, produits..."
                  className="pl-12 bg-slate-800/50 border-blue-600 text-white placeholder-blue-300/60"
                />
              </div>
              <div className="relative flex-1 w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                <Input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Ville, région ou emplacement..."
                  className="pl-12 bg-slate-800/50 border-blue-600 text-white placeholder-blue-300/60"
                />
              </div>
              {isSearching && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[0.75vw] md:gap-[1vw]">
              <div className="flex flex-wrap items-center gap-[0.5vw] sm:gap-[1vw]">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-blue-600 hover:bg-blue-800"
                >
                  <Filter size={16} className="mr-2" />
                  {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
                </Button>

                <Button
                  onClick={() => setSettingsOpen(true)}
                  variant="outline"
                  className="border-emerald-600 hover:bg-emerald-900"
                >
                  <Sparkles size={16} className="mr-2" />
                  Paramètres
                </Button>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                    id="auto-refresh"
                  />
                  <Label htmlFor="auto-refresh" className="text-sm">
                    Actualisation auto
                  </Label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-[0.5vw] sm:gap-[1vw]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-blue-600 bg-slate-800 hover:bg-slate-700 w-full sm:w-[180px] justify-between"
                    >
                      <span className="text-sm">
                        {activeFilters.sort_by === "rating_desc" &&
                          "Meilleure note"}
                        {activeFilters.sort_by === "revenue_desc" &&
                          "Chiffre d'affaires"}
                        {activeFilters.sort_by === "impressions_desc" &&
                          "Plus d'impressions"}
                        {activeFilters.sort_by === "name_asc" && "Nom A-Z"}
                        {!activeFilters.sort_by && "Trier par"}
                      </span>
                      <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-blue-600 w-[200px]">
                    <DropdownMenuItem
                      onClick={() =>
                        setActiveFilters({
                          ...activeFilters,
                          sort_by: "rating_desc",
                        })
                      }
                    >
                      {activeFilters.sort_by === "rating_desc" && (
                        <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                      )}
                      <span
                        className={
                          activeFilters.sort_by === "rating_desc"
                            ? "font-semibold text-blue-300"
                            : "text-blue-200"
                        }
                      >
                        Meilleure note
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setActiveFilters({
                          ...activeFilters,
                          sort_by: "revenue_desc",
                        })
                      }
                    >
                      {activeFilters.sort_by === "revenue_desc" && (
                        <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                      )}
                      <span
                        className={
                          activeFilters.sort_by === "revenue_desc"
                            ? "font-semibold text-blue-300"
                            : "text-blue-200"
                        }
                      >
                        Chiffre d'affaires
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setActiveFilters({
                          ...activeFilters,
                          sort_by: "impressions_desc",
                        })
                      }
                    >
                      {activeFilters.sort_by === "impressions_desc" && (
                        <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                      )}
                      <span
                        className={
                          activeFilters.sort_by === "impressions_desc"
                            ? "font-semibold text-blue-300"
                            : "text-blue-200"
                        }
                      >
                        Plus d'impressions
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setActiveFilters({
                          ...activeFilters,
                          sort_by: "name_asc",
                        })
                      }
                    >
                      {activeFilters.sort_by === "name_asc" && (
                        <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                      )}
                      <span
                        className={
                          activeFilters.sort_by === "name_asc"
                            ? "font-semibold text-blue-300"
                            : "text-blue-200"
                        }
                      >
                        Nom A-Z
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="text-sm text-blue-300">
                  {totalResults.toLocaleString()} résultats
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[0.75vw] sm:gap-[1vw] p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-blue-700">
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
                      Type d'entreprise
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-slate-700 border-blue-600 justify-between"
                        >
                          <span className="text-sm">
                            {businessTypeOptions.find(
                              (t) => t.value === activeFilters.business_type,
                            )?.label || "Tous les types"}
                          </span>
                          <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-blue-600 w-[200px]">
                        <DropdownMenuItem
                          onClick={() =>
                            setActiveFilters({
                              ...activeFilters,
                              business_type: "",
                            })
                          }
                        >
                          <span
                            className={
                              !activeFilters.business_type
                                ? "font-semibold text-blue-300"
                                : "text-blue-200"
                            }
                          >
                            Tous les types
                          </span>
                        </DropdownMenuItem>
                        {businessTypeOptions.map((type) => (
                          <DropdownMenuItem
                            key={type.value}
                            onClick={() =>
                              setActiveFilters({
                                ...activeFilters,
                                business_type: type.value,
                              })
                            }
                          >
                            {activeFilters.business_type === type.value && (
                              <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                            )}
                            <span
                              className={
                                activeFilters.business_type === type.value
                                  ? "font-semibold text-blue-300"
                                  : "text-blue-200"
                              }
                            >
                              {type.label}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
                      Note minimum
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={activeFilters.minRating}
                      onChange={(e) =>
                        setActiveFilters({
                          ...activeFilters,
                          minRating: e.target.value,
                        })
                      }
                      placeholder="Any"
                      className="bg-slate-700 border-blue-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
                      Statut
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-slate-700 border-blue-600 justify-between"
                        >
                          <span className="text-sm">
                            {statusOptions.find(
                              (s) => s.value === activeFilters.status,
                            )?.label || "Tous les statuts"}
                          </span>
                          <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-blue-600 w-[200px]">
                        <DropdownMenuItem
                          onClick={() =>
                            setActiveFilters({ ...activeFilters, status: "" })
                          }
                        >
                          <span
                            className={
                              !activeFilters.status
                                ? "font-semibold text-blue-300"
                                : "text-blue-200"
                            }
                          >
                            Tous les statuts
                          </span>
                        </DropdownMenuItem>
                        {statusOptions.map((status) => (
                          <DropdownMenuItem
                            key={status.value}
                            onClick={() =>
                              setActiveFilters({
                                ...activeFilters,
                                status: status.value,
                              })
                            }
                          >
                            {activeFilters.status === status.value && (
                              <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                            )}
                            <span
                              className={
                                activeFilters.status === status.value
                                  ? "font-semibold text-blue-300"
                                  : "text-blue-200"
                              }
                            >
                              {status.label}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-[0.5vw] mt-4">
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="border-blue-600 hover:bg-blue-800"
                    >
                      Tout effacer
                    </Button>
                    <Button
                      onClick={() => handleSearch()}
                      className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                    >
                      Appliquer les filtres
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] py-[2vh] sm:py-[3vh] md:py-[4vh]">
        {/* Tabs Navigation */}
        <div className="relative mb-[1.5vw] overflow-x-auto scrollbar-hide bg-slate-800/50 rounded-xl p-[0.4vw] border border-blue-500/20 backdrop-blur-sm">
          <div className="flex w-fit mx-auto">
            {(
              [
                "analytics",
                "businesses",
                "finance",
                "ads",
                "database",
              ] as TabType[]
            ).map((tab, index) => (
              <motion.button
                key={tab}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.3,
                  ease: "easeOut",
                }}
                onClick={() => setActiveTab(tab)}
                className={`relative capitalize whitespace-nowrap px-[1vw] py-[0.5vw] rounded-lg text-[clamp(0.65rem,1vw,0.875rem)] font-medium transition-colors duration-200 shrink-0 ${
                  activeTab === tab
                    ? "text-white"
                    : "text-blue-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="commerce-active-tab"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-lg shadow-blue-500/25"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {activeTab === "businesses" && (
          <>
            {/* Live Search Results Section */}
            {hasSearched && (
              <div>
                <div className="flex items-center justify-between mb-[1vw]">
                  <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold flex items-center gap-[0.5vw]">
                    <Database className="h-6 w-6 text-blue-400" />
                    <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                      Résultats ({searchResults.length} sur{" "}
                      {totalResults.toLocaleString()})
                    </span>
                  </h2>
                  <div className="text-sm text-blue-300">
                    {databaseConnected
                      ? "✅ Données PostgreSQL en direct"
                      : "✅ Données réelles"}
                  </div>
                </div>

                {/* Loading State */}
                {isInitialLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1vw]">
                    <Card className="bg-gradient-to-r from-blue-900/30 to-teal-900/30 backdrop-blur-md border border-blue-500/20">
                      <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                            </div>
                            <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-blue-300">
                              Chargement des commerces...
                            </h3>
                            <p className="text-gray-200 mt-2">
                              Connexion à la base de données
                            </p>
                          </div>
                          <ExternalLink className="h-5 w-5 text-blue-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-r from-blue-900/30 to-teal-900/30 backdrop-blur-md border border-blue-500/20">
                      <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                              <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400" />
                            </div>
                            <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-blue-300">
                              Récupération des données...
                            </h3>
                            <p className="text-gray-200 mt-2">
                              Veuillez patienter
                            </p>
                          </div>
                          <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1.5vw]">
                      <AnimatePresence>
                        {isSearching ? (
                          <div className="col-span-full text-center py-[2vh] sm:py-[3vh] md:py-[4vh]">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-teal-600 rounded-full blur-xl opacity-50" />
                              <div className="relative w-20 h-20 bg-gradient-to-r from-blue-600 to-teal-700 rounded-full flex items-center justify-center shadow-2xl">
                                <Search className="h-10 w-10 text-white" />
                              </div>
                            </div>
                            <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-blue-300 mb-2">
                              Recherche dans la base PostgreSQL...
                            </h3>
                            <p className="text-gray-300">
                              Récupération des commerces...
                            </p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((business, index) => (
                            <SectorBusinessCard
                              key={business.id}
                              business={business}
                              index={index}
                              theme="blue"
                              onSelect={handleBusinessSelect}
                              sectorIcon={Store}
                            />
                          ))
                        ) : (
                          <div className="col-span-full text-center py-[2vh] sm:py-[3vh] md:py-[4vh]">
                            <Search className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold text-gray-300 mb-2">
                              Aucun commerce trouvé
                            </h3>
                            <p className="text-gray-400">
                              Essayez une autre recherche ou réinitialisez les
                              filtres
                            </p>
                            <Button
                              onClick={clearAllFilters}
                              className="mt-4 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                            >
                              Réinitialiser la recherche
                            </Button>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Pagination */}
                    {searchResults.length > 0 && (
                      <div className="flex justify-center items-center gap-[1vw] mt-[2vw]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.max(1, currentPage - 1);
                            setCurrentPage(newPage);
                            handleSearch(newPage);
                          }}
                          disabled={currentPage === 1}
                          className="border-blue-600 hover:bg-blue-800"
                        >
                          <ChevronRight className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-1 rotate-180" />
                          Précédent
                        </Button>
                        <span className="text-blue-400 text-[clamp(0.7rem,1vw,0.875rem)]">
                          Page {currentPage} sur {Math.ceil(totalResults / 9)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = currentPage + 1;
                            setCurrentPage(newPage);
                            handleSearch(newPage);
                          }}
                          disabled={currentPage >= Math.ceil(totalResults / 9)}
                          className="border-blue-600 hover:bg-blue-800"
                        >
                          Suivant
                          <ChevronRight className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "analytics" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <AnimatedHeading
              text="Analytique Commerce"
              level={2}
              variant="slow"
              className="text-[clamp(1.125rem,1.6vw,1.5rem)] mb-[1vw] flex items-center gap-[0.5vw]"
            />

            {/* Summary Cards */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1vw] mb-[1.5vw]"
            >
              <AnalyticsCard
                title="Chiffre d'affaires total"
                value={
                  analytics
                    ? `€${(analytics.total_revenue || 0).toLocaleString()}`
                    : "€4.2M"
                }
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}% YoY`
                    : "+18% par rapport au mois dernier"
                }
                trend="up"
                color="blue"
              />
              <AnalyticsCard
                title="Total annonces"
                value={analytics ? `${analytics.total_ads}` : "2,850+"}
                change={
                  analytics
                    ? `+${Math.round((analytics.total_ads || 0) / 100)}%`
                    : "+12% par rapport au mois dernier"
                }
                trend="up"
                color="teal"
              />
              <AnalyticsCard
                title="CTR moyen"
                value={
                  analytics ? `${analytics.average_ctr.toFixed(1)}%` : "5.2%"
                }
                change={
                  analytics
                    ? `+${analytics.average_ctr * 0.1 || 5}%`
                    : "+5% par rapport au mois dernier"
                }
                trend="up"
                color="orange"
              />
              <AnalyticsCard
                title="ROI moyen"
                value={
                  analytics ? `${analytics.average_roi.toFixed(1)}x` : "4.2x"
                }
                change={
                  analytics
                    ? `+${analytics.average_roi * 0.1 || 8}%`
                    : "+8% par rapport au mois dernier"
                }
                trend="up"
                color="purple"
              />
            </motion.div>

            {/* Charts and Details */}
            <div className="grid lg:grid-cols-2 gap-[1vw] mb-[1.5vw]">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-blue-500/20">
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold text-white">
                      Tendances revenus & annonces
                    </h3>
                    <Calendar className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="chart-container h-48 sm:h-60 md:h-72">
                    <canvas ref={chartRef}></canvas>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-blue-500/20">
                <CardContent>
                  <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold mb-6 text-white">
                    Revenus par catégorie
                  </h3>
                  <div className="chart-container h-48 sm:h-60 md:h-72">
                    <canvas ref={barChartRef}></canvas>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1.5vw]">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-blue-500/20">
                <CardContent>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-4 text-white">
                    Catégories principales
                  </h3>
                  <div className="space-y-4">
                    {analytics?.top_categories?.map((category, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <span className="block font-medium text-white capitalize">
                            {category.category}
                          </span>
                          <span className="text-sm text-green-400">
                            {category.ads_count || 0} annonces
                          </span>
                        </div>
                        <span className="font-semibold text-blue-300">
                          €{(category.revenue || 0).toLocaleString()}
                        </span>
                      </div>
                    )) || (
                      <>
                        {[
                          {
                            category: "electronics",
                            revenue: 1254000,
                            ads_count: 420,
                          },
                          {
                            category: "fashion",
                            revenue: 892000,
                            ads_count: 385,
                          },
                          {
                            category: "food",
                            revenue: 568000,
                            ads_count: 298,
                          },
                          {
                            category: "technology",
                            revenue: 423000,
                            ads_count: 245,
                          },
                          {
                            category: "real-estate",
                            revenue: 287000,
                            ads_count: 198,
                          },
                        ].map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center"
                          >
                            <div>
                              <span className="block font-medium text-white capitalize">
                                {item.category}
                              </span>
                              <span className="text-sm text-green-400">
                                {item.ads_count} ads
                              </span>
                            </div>
                            <span className="font-semibold text-blue-300">
                              €{item.revenue.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-blue-500/20">
                <CardContent>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-4 text-white">
                    Ventes par région
                  </h3>
                  <div className="space-y-4">
                    {analytics?.top_regions?.map((region, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">
                            {region.region}
                          </span>
                          <span className="font-semibold text-blue-300">
                            €{(region.revenue || 0).toLocaleString()}
                          </span>
                        </div>
                        <ProgressBar
                          percent={region.percentage || 0}
                          className="h-2"
                        />
                        <div className="text-right text-sm text-blue-400 mt-1">
                          {region.percentage || 0}%
                        </div>
                      </div>
                    )) || (
                      <>
                        {[
                          {
                            region: "Europe",
                            revenue: 1985200,
                            percentage: 41,
                          },
                          {
                            region: "Amérique du Nord",
                            revenue: 1763400,
                            percentage: 32,
                          },
                          {
                            region: "Asie-Pacifique",
                            revenue: 1432100,
                            percentage: 18,
                          },
                          {
                            region: "Afrique",
                            revenue: 6219300,
                            percentage: 9,
                          },
                        ].map((region, index) => (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-white">
                                {region.region}
                              </span>
                              <span className="font-semibold text-blue-300">
                                €{region.revenue.toLocaleString()}
                              </span>
                            </div>
                            <ProgressBar
                              percent={region.percentage || 0}
                              className="h-2"
                            />
                            <div className="text-right text-sm text-blue-400 mt-1">
                              {region.percentage}%
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-blue-500/20">
                <CardContent>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-4 text-white">
                    Indicateurs de performance
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        metric: "Total entreprises",
                        value: analytics
                          ? analytics.total_businesses.toLocaleString()
                          : "1,240",
                        change: "+12%",
                      },
                      {
                        metric: "Note moyenne",
                        value: analytics
                          ? analytics.average_rating.toFixed(1)
                          : "4.6",
                        change: "+3%",
                      },
                      {
                        metric: "CTR",
                        value: analytics
                          ? `${analytics.average_ctr.toFixed(1)}%`
                          : "5.2%",
                        change: "+2.1%",
                      },
                      {
                        metric: "ROI",
                        value: analytics
                          ? `${analytics.average_roi.toFixed(1)}x`
                          : "4.2x",
                        change: "+8%",
                      },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span className="text-gray-300">{item.metric}</span>
                        <div className="text-right">
                          <div className="font-semibold text-white">
                            {item.value}
                          </div>
                          <div
                            className={`text-sm ${
                              item.change.startsWith("+")
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {item.change}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-[1vw] flex items-center gap-[0.5vw]">
              <DollarSign className="h-6 w-6" />
              Tableau de bord financier
            </h2>
            <p className="text-gray-300 mb-6">
              Analytique financière et indicateurs de performance du secteur
              commerce.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
              {[
                { title: "Dépenses pub", value: "€850K", change: "+22%" },
                { title: "Revenus pub", value: "€3.2M", change: "+18%" },
                { title: "Bénéfice net", value: "€1.4M", change: "+15%" },
                {
                  title: "Coûts d'exploitation",
                  value: "€450K",
                  change: "+8%",
                },
                { title: "Marge bénéficiaire", value: "32%", change: "+5%" },
                { title: "ROI", value: "4.2x", change: "+12%" },
              ].map((metric, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {metric.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-blue-300 mb-1">
                      {metric.value}
                    </div>
                    <div className="text-green-400 text-sm">
                      {metric.change} par rapport au mois dernier
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ads" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-[1vw] flex items-center gap-[0.5vw]">
              <Megaphone className="h-6 w-6" />
              Publicité & Marketing
            </h2>
            <p className="text-gray-300 mb-6">
              Gérez les campagnes et activités promotionnelles pour les
              commerces.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
              {[
                { title: "Campagnes actives", value: "42", status: "En cours" },
                { title: "Budget total", value: "€285K", status: "Alloué" },
                { title: "Taux d'engagement", value: "6.8%", status: "Élevé" },
                {
                  title: "Taux de clic",
                  value: "5.2%",
                  status: "Excellent",
                },
                { title: "Taux de conversion", value: "3.8%", status: "Bon" },
                { title: "ROAS", value: "4.2x", status: "Excellent" },
              ].map((ad, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {ad.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-blue-300 mb-1">
                      {ad.value}
                    </div>
                    <div
                      className={`text-sm ${
                        ad.status === "Excellent"
                          ? "text-green-400"
                          : ad.status === "Bon"
                            ? "text-blue-400"
                            : ad.status === "Élevé"
                              ? "text-yellow-400"
                              : "text-purple-400"
                      }`}
                    >
                      {ad.status}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "database" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-3 sm:mb-4 text-blue-300 flex items-center gap-[0.5vw]">
              <Database className="h-6 w-6" />
              Connexion base de données PostgreSQL
            </h2>
            <div className="grid md:grid-cols-2 gap-[1vw]">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-blue-200">
                  Statistiques de la base
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">
                      Total enregistrements commerce
                    </span>
                    <span className="font-semibold text-white">
                      {totalResults.toLocaleString()}+
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">Entreprises actives</span>
                    <span className="font-semibold text-white">
                      {searchResults.length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">Statut de la base</span>
                    <span
                      className={`font-semibold ${
                        databaseConnected ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {databaseConnected ? "Connectée ✅" : "Déconnectée ❌"}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">Point d'accès API</span>
                    <span className="font-mono text-sm text-blue-400">
                      {API_BASE_URL}
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-blue-200">
                  Actions rapides
                </h3>
                <div className="space-y-[0.75vw]">
                  <Button
                    onClick={() =>
                      window.open(`${API_BASE_URL}/health`, "_blank")
                    }
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                  >
                    Tester la connexion
                  </Button>
                  <Button
                    onClick={() => {
                      handleSearch(1);
                    }}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    Actualiser les données
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Commerce Features Section */}
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] py-8 sm:py-12 md:py-16">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12">
          <span className="bg-gradient-to-r from-blue-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
            Réseau Commerce Verso Air
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-[0.75vw] sm:gap-5 md:gap-8">
          {commerceFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gradient-to-br from-slate-800/50 to-blue-900/30 backdrop-blur-md rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] text-center border border-blue-500/20 hover:border-blue-500/40 transition-all"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-600/20 to-teal-600/20 rounded-lg">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold mb-2 text-white">
                {feature.title}
              </h3>
              <p className="text-gray-300">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Business Details Modal */}
      <AnimatePresence>
        {showBusinessDetails && selectedBusiness && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBusinessDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-blue-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-slate-800/90 backdrop-blur-md border-b border-slate-700 p-[clamp(0.75rem,2vw,2.5rem)] flex justify-between items-center">
                <h2 className="text-base sm:text-lg md:text-2xl font-bold text-white">
                  {selectedBusiness.title}
                </h2>
                <button
                  onClick={() => setShowBusinessDetails(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="p-[clamp(0.75rem,2vw,2.5rem)] space-y-4 sm:space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-[0.5vw] mb-2">
                      <MapPin className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-gray-400" />
                      <span className="text-gray-300">
                        {selectedBusiness.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-[0.5vw]">
                      <Badge
                        variant="outline"
                        className="bg-blue-900/30 text-blue-300 border-blue-500/30"
                      >
                        {selectedBusiness.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-teal-900/30 text-teal-300 border-teal-500/30"
                      >
                        {selectedBusiness.business_type}
                      </Badge>
                      <div className="flex items-center gap-1 bg-blue-900/50 text-yellow-400 px-2 py-1 rounded text-sm">
                        <Star className="h-[clamp(0.75rem,1vw,1rem)] w-[clamp(0.75rem,1vw,1rem)] fill-current" />
                        <span className="font-bold">
                          {selectedBusiness.rating}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">
                          ({selectedBusiness.reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2">
                    Description
                  </h3>
                  <p className="text-gray-300">
                    {selectedBusiness.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[0.75vw] sm:gap-[1vw]">
                  {selectedBusiness.revenue && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">Revenue</div>
                        <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                          €{selectedBusiness.revenue.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedBusiness.employees && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">Employees</div>
                        <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                          {selectedBusiness.employees}+
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-gray-400">Contact</div>
                      <div className="text-sm font-semibold text-white">
                        {selectedBusiness.phone || "Not specified"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-gray-400">Email</div>
                      <div className="text-sm font-semibold text-white truncate">
                        {selectedBusiness.email || "Not specified"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedBusiness.tags && selectedBusiness.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-[0.5vw]">
                      {selectedBusiness.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-slate-800/50 text-gray-300 border-slate-600"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-[1vw] pt-6 border-t border-slate-700">
                  <Button className="flex-1 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700">
                    Contacter le commerce
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600 hover:bg-slate-800"
                    onClick={() => setShowBusinessDetails(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        sector="commerce"
      />
      <ScrollToTop />
    </div>
  );
}

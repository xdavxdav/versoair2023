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
  Music,
  Film,
  Mic,
  Ticket,
  Star,
  Play,
  Heart,
  Share,
  Volume2,
  Video,
  Radio,
  Gamepad2,
  Palette,
  Camera,
  Database,
  Activity,
  ExternalLink,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Pause,
  Clock,
  Globe,
  BarChart3,
  CreditCard,
  Sparkles,
  Building,
  DollarSign,
  Briefcase,
  MapPin,
  Hotel,
  Utensils,
  Wine,
  ConciergeBell,
  Trees,
  CheckCircle,
  Phone,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

// Database API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Database types - SIMILAR TO HOSPITALITY
interface EntertainmentAnalytics {
  total_revenue: number;
  occupancy_rate: number;
  average_daily_rate: number;
  guest_satisfaction: number;
  year_over_year_growth: number;
  top_categories: Array<{
    category: string;
    revenue: number;
    occupancy: number;
  }>;
  monthly_trends: Array<{ month: string; revenue: number; bookings: number }>;
  top_regions: Array<{ region: string; revenue: number; percentage: number }>;
  upcoming_events?: Array<{
    title: string;
    date: string;
    venue: string;
    tickets_available: number;
  }>;
  top_artists?: Array<{ name: string; streams: number; genre: string }>;
}

// Database API functions - SIMILAR TO HOSPITALITY
async function fetchEntertainmentAnalytics(): Promise<EntertainmentAnalytics> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/entertainment/analytics`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch entertainment analytics:", error);
    return {
      total_revenue: 0,
      occupancy_rate: 0,
      average_daily_rate: 0,
      guest_satisfaction: 0,
      year_over_year_growth: 0,
      top_categories: [],
      monthly_trends: [],
      top_regions: [],
      upcoming_events: [],
      top_artists: [],
    };
  }
}

async function searchEntertainmentBusinesses(params: {
  query?: string;
  category?: string;
  location?: string;
  min_rating?: number;
  min_revenue?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  status?: string;
  amenities?: string;
  countryCode?: string;
}): Promise<{ data: Business[]; total: number; success: boolean }> {
  try {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append("query", params.query);
    if (params.category) queryParams.append("category", params.category);
    if (params.location) queryParams.append("location", params.location);
    if (params.min_rating)
      queryParams.append("min_rating", params.min_rating.toString());
    if (params.min_revenue)
      queryParams.append("min_revenue", params.min_revenue.toString());
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.status) queryParams.append("status", params.status);
    if (params.amenities) queryParams.append("amenities", params.amenities);

    // Search within Divertissement & Loisirs sector pool (parent category ID 6)
    const results = await searchBusinesses({
      query: params.query,
      sectorId: 6,
      location: params.location,
      countryCode: params.countryCode,
      limit: params.limit || 50,
    });
    return { data: results, total: results.length, success: true };
  } catch (error) {
    console.error("Search failed:", error);
    return { data: [], total: 0, success: false };
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

// Filter options - SIMILAR TO HOSPITALITY
const categoryOptions = [
  { value: "music", label: "Music Production" },
  { value: "film", label: "Film & TV Production" },
  { value: "event", label: "Event Management" },
  { value: "theater", label: "Theater & Performing Arts" },
  { value: "gaming", label: "Gaming & eSports" },
  { value: "art", label: "Art & Culture" },
  { value: "broadcasting", label: "Broadcasting" },
  { value: "digital", label: "Digital Media" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "popular", label: "Popular" },
  { value: "premium", label: "Premium" },
  { value: "inactive", label: "Inactive" },
];

type TabType = "analytics" | "businesses" | "finance" | "ads" | "database";

export default function Entertainment() {
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
    minRating: "",
    minRevenue: "",
    status: "",
    amenities: "",
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

  // Database connection test
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testDatabaseConnection();
      console.log("[DIVERTISSEMENT] Connection test result:", result);
      // Mark as connected if success is true
      const connected = result.success === true;
      setDatabaseConnected(connected);
      console.log(
        connected
          ? "✅ [DIVERTISSEMENT] Database connected"
          : "❌ [DIVERTISSEMENT] Database not connected",
      );
    };
    checkConnection();
  }, []);

  // Fetch entertainment analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["entertainment-analytics"],
    queryFn: fetchEntertainmentAnalytics,
    refetchInterval: autoRefresh ? 300000 : false,
    staleTime: 60000,
    enabled: databaseConnected === true,
  });

  // Fetch initial entertainment businesses
  const fetchBusinesses = useCallback(async () => {
    if (databaseConnected === false) return;

    setIsInitialLoading(true);
    const result = await searchEntertainmentBusinesses({
      category:
        "entertainment,music,film,theater,event,gaming,art,broadcasting",
      countryCode: selectedCountry || undefined,
      limit: 9,
      sort_by: activeFilters.sort_by,
    });
    if (result.success) {
      setSearchResults(result.data);
      setTotalResults(result.total);
      setHasSearched(true);
    }
    setIsInitialLoading(false);
  }, [databaseConnected, activeFilters.sort_by, selectedCountry]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Debounced search - auto-fetch after user stops typing
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

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

  // Search handler - FIXED PAGINATION
  const handleSearch = async (page: number = 1) => {
    setIsSearching(true);
    setCurrentPage(page);
    const params: any = {
      query: searchQuery,
      category:
        "entertainment,music,film,theater,event,gaming,art,broadcasting",
      limit: 9,
      page: page,
      sort_by: activeFilters.sort_by,
    };

    if (locationQuery) params.location = locationQuery;
    if (selectedCountry) params.countryCode = selectedCountry;
    if (activeFilters.category) params.category = activeFilters.category;
    if (activeFilters.minRating)
      params.min_rating = parseFloat(activeFilters.minRating);
    if (activeFilters.minRevenue)
      params.min_revenue = parseInt(activeFilters.minRevenue);
    if (activeFilters.status) params.status = activeFilters.status;
    if (activeFilters.amenities) params.amenities = activeFilters.amenities;

    const result = await searchEntertainmentBusinesses(params);
    if (result.success) {
      setSearchResults(result.data);
      setTotalResults(result.total);
      setHasSearched(true);
    }
    setIsSearching(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({
      category: "",
      minRating: "",
      minRevenue: "",
      status: "",
      amenities: "",
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
    }>
  >([
    {
      name: "Loading entertainment businesses...",
      desc: "Connecting to database",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Update carousel with database results
  useEffect(() => {
    if (searchResults.length > 0) {
      const featuredEnterprises = searchResults.slice(0, 8).map((business) => ({
        name: business.title,
        desc: business.description || "Premium entertainment establishment",
        image: `https://images.unsplash.com/photo-${Math.floor(
          Math.random() * 1000,
        )}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80`,
        rating: business.rating,
        location: business.location,
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

  // Initialize charts - SIMILAR TO HOSPITALITY
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
        const bookingsData = analytics.monthly_trends.map(
          (t) => t.bookings || 0,
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
                label: "Events",
                data: bookingsData,
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
                      : `${context.raw.toLocaleString()} events`;
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

  // Initialize bar chart - SIMILAR TO HOSPITALITY
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
                label: "Revenue by Category (€)",
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

  // Entertainment features - SIMILAR TO HOSPITALITY
  const entertainmentFeatures = [
    {
      icon: <Database className="h-8 w-8" />,
      title: "PostgreSQL Database",
      description: "Live entertainment records from Verso Air database",
    },
    {
      icon: <Music className="h-8 w-8" />,
      title: "Music Production",
      description: "Recording studios, artists, and music labels",
    },
    {
      icon: <Film className="h-8 w-8" />,
      title: "Film & TV",
      description: "Production companies and streaming services",
    },
    {
      icon: <Ticket className="h-8 w-8" />,
      title: "Live Events",
      description: "Concerts, festivals, and cultural events",
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Reach",
      description: "Entertainment businesses in 50+ countries",
    },
    {
      icon: <Activity className="h-8 w-8" />,
      title: "Live Analytics",
      description: "Real-time performance monitoring",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-gray-900 via-pink-900/20 to-gray-900 text-white">
      {/* Database Connection Status */}
      <div
        className="fixed bottom-4 right-4 z-50"
        title={databaseConnected ? "Database connected" : "Database offline"}
      >
        <div
          className={`w-2.5 h-2.5 rounded-full ${databaseConnected ? "bg-green-500" : "bg-red-500"}`}
        />
      </div>

      {/* Hero + Carousel Container */}
      <div className="relative min-h-[100dvh] md:min-h-0 md:h-[600px] flex flex-col justify-center items-center text-center px-4 sm:px-6 overflow-hidden py-8 md:py-0">
        {/* eslint-disable-next-line */}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out`}
          /* webhint-disable-next-line hint-no-inline-styles */
          style={{
            backgroundImage: `url(${enterprises[currentIndex]?.image})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 to-pink-900/90"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20">
              🎬 Entertainment Intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-2xl"
          >
            Entertainment Business Database
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl mb-4 text-white/90"
          >
            Real-time PostgreSQL database with {totalResults.toLocaleString()}+
            music, film, and entertainment businesses
          </motion.p>

          {/* Database Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8"
          >
            <Card className="bg-white/10 backdrop-blur-md border-purple-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-purple-200">Live Database</span>
                </div>
                <div className="text-base sm:text-lg md:text-xl font-bold text-white">
                  {totalResults.toLocaleString()}+ Records
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-md border-pink-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-pink-400" />
                  <span className="text-sm text-pink-200">
                    Music & Film Businesses
                  </span>
                </div>
                <div className="text-base sm:text-lg md:text-xl font-bold text-white">
                  {searchResults.length} Loaded
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
                className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-md rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-purple-500/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      {[
                        ...Array(
                          Math.floor(enterprises[currentIndex]?.rating || 5),
                        ),
                      ].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-purple-300">
                      {enterprises[currentIndex]?.name}
                    </h3>
                    <p className="text-gray-200 mt-2">
                      {enterprises[currentIndex]?.desc}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-purple-200">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {enterprises[currentIndex]?.location ||
                          "Location not specified"}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-purple-400" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="max-w-5xl mx-auto px-2 sm:px-4 -mt-8 relative z-20">
        <Card className="bg-gradient-to-br from-slate-800/90 to-purple-900/90 backdrop-blur-md border-purple-700 shadow-2xl">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search music labels, film studios, event venues..."
                  className="pl-12 bg-slate-800/50 border-purple-600 text-white placeholder-purple-300/60"
                />
              </div>
              <div className="relative flex-1 w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                <Input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="City, region, or entertainment district..."
                  className="pl-12 bg-slate-800/50 border-purple-600 text-white placeholder-purple-300/60"
                />
              </div>
              {isSearching && (
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-purple-600 hover:bg-purple-800"
                >
                  <Filter size={16} className="mr-2" />
                  {showFilters ? "Hide Filters" : "Show Filters"}
                </Button>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                    id="auto-refresh"
                  />
                  <Label htmlFor="auto-refresh" className="text-sm">
                    Auto-refresh
                  </Label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full sm:w-[180px] bg-slate-700 border-purple-600 justify-between"
                    >
                      <span className="text-sm">
                        {activeFilters.sort_by === "rating_desc"
                          ? "Highest Rating"
                          : activeFilters.sort_by === "revenue_desc"
                            ? "Highest Revenue"
                            : activeFilters.sort_by === "streams_desc"
                              ? "Most Streams"
                              : activeFilters.sort_by === "name_asc"
                                ? "Name A-Z"
                                : "Sort by"}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[200px]">
                    {[
                      { value: "rating_desc", label: "Highest Rating" },
                      { value: "revenue_desc", label: "Highest Revenue" },
                      { value: "streams_desc", label: "Most Streams" },
                      { value: "name_asc", label: "Name A-Z" },
                    ].map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveFilters({
                            ...activeFilters,
                            sort_by: option.value,
                          });
                        }}
                      >
                        {activeFilters.sort_by === option.value && (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        <span
                          className={
                            activeFilters.sort_by === option.value
                              ? "font-semibold text-purple-300"
                              : "text-purple-200"
                          }
                        >
                          {option.label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="text-sm text-purple-300">
                  {totalResults.toLocaleString()} results
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-visible"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-purple-700">
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      Category
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-slate-700 border-purple-600 justify-between"
                        >
                          <span className="text-sm">
                            {categoryOptions.find(
                              (c) => c.value === activeFilters.category,
                            )?.label || "All Categories"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="bg-slate-800 border-purple-600 w-[200px]"
                        side="bottom"
                        align="start"
                        sideOffset={8}
                      >
                        {categoryOptions.map((cat) => (
                          <DropdownMenuItem
                            key={cat.value}
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveFilters({
                                ...activeFilters,
                                category: cat.value,
                              });
                            }}
                          >
                            {activeFilters.category === cat.value && (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            <span
                              className={
                                activeFilters.category === cat.value
                                  ? "font-semibold text-purple-300"
                                  : "text-purple-200"
                              }
                            >
                              {cat.label}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      Min Rating
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
                      className="bg-slate-700 border-purple-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      Min Revenue
                    </Label>
                    <Input
                      type="number"
                      value={activeFilters.minRevenue}
                      onChange={(e) =>
                        setActiveFilters({
                          ...activeFilters,
                          minRevenue: e.target.value,
                        })
                      }
                      placeholder="Any"
                      className="bg-slate-700 border-purple-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      Status
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-slate-700 border-purple-600 justify-between"
                        >
                          <span className="text-sm">
                            {statusOptions.find(
                              (s) => s.value === activeFilters.status,
                            )?.label || "Any Status"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="bg-slate-800 border-purple-600 w-[200px]"
                        side="bottom"
                        align="start"
                        sideOffset={8}
                      >
                        {statusOptions.map((status) => (
                          <DropdownMenuItem
                            key={status.value}
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveFilters({
                                ...activeFilters,
                                status: status.value,
                              });
                            }}
                          >
                            {activeFilters.status === status.value && (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            <span
                              className={
                                activeFilters.status === status.value
                                  ? "font-semibold text-purple-300"
                                  : "text-purple-200"
                              }
                            >
                              {status.label}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="border-purple-600 hover:bg-purple-800"
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={() => handleSearch()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        {/* Tabs Navigation */}
        <div className="relative flex space-x-1 mb-4 sm:mb-6 md:mb-8 overflow-x-auto pb-2 bg-slate-800/50 rounded-xl p-1.5 border border-purple-500/20 backdrop-blur-sm">
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
              className={`relative capitalize whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                activeTab === tab
                  ? "text-white"
                  : "text-purple-300 hover:text-white hover:bg-white/5"
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="divertissement-active-tab"
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg shadow-lg shadow-purple-500/25"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </motion.button>
          ))}
        </div>

        {activeTab === "businesses" && (
          <>
            {/* Live Search Results Section */}
            {hasSearched && (
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
                    <Database className="h-6 w-6 text-purple-400" />
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Database Results ({searchResults.length} of{" "}
                      {totalResults.toLocaleString()})
                    </span>
                  </h2>
                  <div className="text-sm text-purple-300">
                    {databaseConnected
                      ? "✅ Live PostgreSQL Data"
                      : "✅ Real Database Data"}
                  </div>
                </div>

                {/* Loading State */}
                {isInitialLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-md border border-purple-500/20">
                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-purple-300">
                              Loading entertainment businesses...
                            </h3>
                            <p className="text-gray-200 mt-2">
                              Connecting to database
                            </p>
                          </div>
                          <ExternalLink className="h-5 w-5 text-purple-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-md border border-purple-500/20">
                      <CardContent className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            </div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-purple-300">
                              Fetching data...
                            </h3>
                            <p className="text-gray-200 mt-2">Please wait</p>
                          </div>
                          <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                      <AnimatePresence>
                        {isSearching ? (
                          <div className="col-span-full text-center py-6 sm:py-8 md:py-12">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full blur-xl opacity-50" />
                              <div className="relative w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-700 rounded-full flex items-center justify-center shadow-2xl">
                                <Search className="h-10 w-10 text-white" />
                              </div>
                            </div>
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-purple-300 mb-2">
                              Searching PostgreSQL Database...
                            </h3>
                            <p className="text-gray-300">
                              Fetching entertainment businesses...
                            </p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((business, index) => (
                            <motion.div
                              key={business.id}
                              initial={{ opacity: 0, y: 40 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              whileHover={{ y: -5, scale: 1.01 }}
                              onClick={() => handleBusinessSelect(business)}
                              className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-500 border border-gray-700 hover:border-purple-500/30 cursor-pointer group"
                            >
                              <div className="h-2 bg-gradient-to-r from-pink-600 to-purple-600" />
                              <div className="p-3 sm:p-4 md:p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-white group-hover:text-purple-300 transition-colors mb-2 line-clamp-1">
                                      {business.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-gray-400">
                                      <Building className="h-4 w-4 text-purple-500" />
                                      <span className="text-sm capitalize font-medium">
                                        {business.address || business.location}
                                      </span>
                                      {business.is_verified && (
                                        <Badge className="bg-blue-900/30 text-blue-300 border-blue-500/30 text-xs">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Verified
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2 bg-gradient-to-br from-pink-400 to-purple-500 px-3 py-2 rounded-xl shadow-xl">
                                      <Star className="h-4 w-4 text-white" />
                                      <span className="text-sm font-bold text-white">
                                        {business.rating}
                                      </span>
                                    </div>
                                    {business.status === "premium" && (
                                      <Badge className="bg-green-900/30 text-green-300 border-green-500/30 text-xs">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Premium
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-2">
                                  {business.description}
                                </p>

                                <div className="space-y-3 mb-4">
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-purple-400" />
                                      <span className="text-gray-300">
                                        {business.reviews?.toLocaleString() ||
                                          0}{" "}
                                        reviews
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Music className="h-4 w-4 text-pink-400" />
                                      <span className="text-gray-300">
                                        Entertainment
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-blue-400" />
                                      <span className="text-gray-300 capitalize">
                                        {business.location}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Tag className="h-4 w-4 text-orange-400" />
                                      <span className="text-gray-300 capitalize">
                                        {business.category}
                                      </span>
                                    </div>
                                  </div>
                                  {business.tags &&
                                    business.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {business.tags
                                          .slice(0, 3)
                                          .map((tag, i) => (
                                            <Badge
                                              key={i}
                                              className="bg-pink-900/20 text-pink-300 border-pink-500/30 text-xs"
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                      </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-gray-700 gap-3">
                                  <div>
                                    {business.revenue && (
                                      <>
                                        <span className="text-base sm:text-lg md:text-xl font-bold text-green-300">
                                          €
                                          {(business.revenue / 1000).toFixed(0)}
                                          K
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                          {" "}
                                          / month
                                        </span>
                                      </>
                                    )}
                                    {business.employees && (
                                      <div className="text-sm text-gray-300">
                                        {business.employees} employees
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      <Heart className="h-4 w-4 text-gray-400" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBusinessSelect(business);
                                      }}
                                    >
                                      <Phone className="h-4 w-4 mr-2" />
                                      Contact
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-6 sm:py-8 md:py-12">
                            <Search className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-300 mb-2">
                              No Businesses Found
                            </h3>
                            <p className="text-gray-400">
                              Try a different search or clear filters
                            </p>
                            <Button
                              onClick={clearAllFilters}
                              className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                              Reset Search
                            </Button>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Pagination */}
                    {searchResults.length > 0 && (
                      <div className="flex justify-center items-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.max(1, currentPage - 1);
                            setCurrentPage(newPage);
                            handleSearch(newPage);
                          }}
                          disabled={currentPage === 1}
                          className="border-purple-600 hover:bg-purple-800"
                        >
                          <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                          Previous
                        </Button>
                        <span className="text-purple-400 text-sm">
                          Page {currentPage} of {Math.ceil(totalResults / 9)}
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
                          className="border-purple-600 hover:bg-purple-800"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 md:p-8 border border-white/20">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Entertainment Analytics
            </h2>

            {/* Summary Cards */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8"
            >
              <AnalyticsCard
                title="Event Attendance Rate"
                value={analytics ? `${analytics.occupancy_rate}%` : "78%"}
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}% YoY`
                    : "+22% from last month"
                }
                trend="up"
                color="purple"
              />
              <AnalyticsCard
                title="Avg Ticket Price"
                value={analytics ? `€${analytics.average_daily_rate}` : "€85"}
                change={
                  analytics
                    ? `+${Math.round(
                        (analytics.average_daily_rate || 0) / 10,
                      )}%`
                    : "+15% from last month"
                }
                trend="up"
                color="pink"
              />
              <AnalyticsCard
                title="Audience Satisfaction"
                value={
                  analytics ? `${analytics.guest_satisfaction}/10` : "4.7/5"
                }
                change={
                  analytics
                    ? `+${analytics.guest_satisfaction * 0.1 || 5}%`
                    : "+5% from last month"
                }
                trend="up"
                color="blue"
              />
              <AnalyticsCard
                title="Total Revenue"
                value={
                  analytics
                    ? `€${(analytics.total_revenue || 0).toLocaleString()}`
                    : "€85M"
                }
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}% YoY`
                    : "+25% from last month"
                }
                trend="up"
                color="orange"
              />
            </motion.div>

            {/* Charts and Details */}
            <div className="grid lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-purple-500/20">
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white">
                      Revenue & Events Trends
                    </h3>
                    <Calendar className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="chart-container h-48 sm:h-60 md:h-72">
                    <canvas ref={chartRef}></canvas>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-purple-500/20">
                <CardContent>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-6 text-white">
                    Revenue by Category
                  </h3>
                  <div className="chart-container h-48 sm:h-60 md:h-72">
                    <canvas ref={barChartRef}></canvas>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-purple-500/20">
                <CardContent>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-4 text-white">
                    Top Categories
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
                            {category.occupancy || 0}% occupancy
                          </span>
                        </div>
                        <span className="font-semibold text-purple-300">
                          €{(category.revenue || 0).toLocaleString()}
                        </span>
                      </div>
                    )) || (
                      <>
                        {[
                          {
                            category: "Music Production",
                            revenue: 35400,
                            occupancy: 85,
                          },
                          {
                            category: "Film & TV",
                            revenue: 28900,
                            occupancy: 78,
                          },
                          {
                            category: "Live Events",
                            revenue: 18600,
                            occupancy: 72,
                          },
                          {
                            category: "Gaming & eSports",
                            revenue: 14300,
                            occupancy: 68,
                          },
                          {
                            category: "Digital Media",
                            revenue: 9700,
                            occupancy: 65,
                          },
                        ].map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center"
                          >
                            <div>
                              <span className="block font-medium text-white">
                                {item.category}
                              </span>
                              <span className="text-sm text-green-400">
                                {item.occupancy}% occupancy
                              </span>
                            </div>
                            <span className="font-semibold text-purple-300">
                              €{item.revenue.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-purple-500/20">
                <CardContent>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-4 text-white">
                    Sales by Region
                  </h3>
                  <div className="space-y-4">
                    {analytics?.top_regions?.map((region, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-white">
                            {region.region}
                          </span>
                          <span className="font-semibold text-purple-300">
                            €{(region.revenue || 0).toLocaleString()}
                          </span>
                        </div>
                        <ProgressBar
                          percent={region.percentage || 0}
                          className="h-2"
                        />
                        <div className="text-right text-sm text-purple-400 mt-1">
                          {region.percentage || 0}%
                        </div>
                      </div>
                    )) || (
                      <>
                        {[
                          {
                            region: "North America",
                            revenue: 485200,
                            percentage: 41,
                          },
                          { region: "Europe", revenue: 363400, percentage: 32 },
                          {
                            region: "Asia Pacific",
                            revenue: 232100,
                            percentage: 18,
                          },
                          { region: "Africa", revenue: 119300, percentage: 9 },
                        ].map((region, index) => (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-white">
                                {region.region}
                              </span>
                              <span className="font-semibold text-purple-300">
                                €{region.revenue.toLocaleString()}
                              </span>
                            </div>
                            <ProgressBar
                              percent={region.percentage || 0}
                              className="h-2"
                            />
                            <div className="text-right text-sm text-purple-400 mt-1">
                              {region.percentage}%
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-purple-500/20">
                <CardContent>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-4 text-white">
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        metric: "Event Fill Rate",
                        value: analytics
                          ? `${analytics.occupancy_rate}%`
                          : "78%",
                        change: "+22%",
                      },
                      {
                        metric: "Avg Ticket Price",
                        value: analytics
                          ? `€${analytics.average_daily_rate}`
                          : "€85",
                        change: "+15%",
                      },
                      {
                        metric: "Stream Count",
                        value: "105M",
                        change: "+35%",
                      },
                      {
                        metric: "Audience Score",
                        value: analytics
                          ? `${analytics.guest_satisfaction}/10`
                          : "4.7/5",
                        change: "+5%",
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 md:p-8 border border-white/20">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Financial Dashboard
            </h2>
            <p className="text-gray-300 mb-6">
              Financial analytics and performance metrics for entertainment
              sector.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {[
                { title: "Ticket Revenue", value: "€45M", change: "+22%" },
                { title: "Streaming Revenue", value: "€28M", change: "+35%" },
                { title: "Sponsorship", value: "€12M", change: "+18%" },
                { title: "Production Costs", value: "€32M", change: "+12%" },
                { title: "Profit Margin", value: "32%", change: "+4%" },
                { title: "ROI", value: "28%", change: "+6%" },
              ].map((metric, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {metric.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-purple-300 mb-1">
                      {metric.value}
                    </div>
                    <div className="text-green-400 text-sm">
                      {metric.change} from last month
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ads" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 md:p-8 border border-white/20">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Advertising & Promotions
            </h2>
            <p className="text-gray-300 mb-6">
              Manage campaigns and promotional activities for entertainment
              businesses.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {[
                { title: "Active Campaigns", value: "18", status: "Running" },
                { title: "Total Budget", value: "€120K", status: "Allocated" },
                { title: "Engagement Rate", value: "6.8%", status: "High" },
                {
                  title: "Click-through Rate",
                  value: "3.2%",
                  status: "Average",
                },
                { title: "Conversion Rate", value: "2.8%", status: "Good" },
                { title: "ROAS", value: "4.2x", status: "Excellent" },
              ].map((ad, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {ad.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-purple-300 mb-1">
                      {ad.value}
                    </div>
                    <div
                      className={`text-sm ${
                        ad.status === "Excellent"
                          ? "text-green-400"
                          : ad.status === "Good"
                            ? "text-blue-400"
                            : ad.status === "Average"
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 md:p-8 border border-white/20">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-purple-300 flex items-center gap-2">
              <Database className="h-6 w-6" />
              PostgreSQL Database Connection
            </h2>
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-purple-200">
                  Database Stats
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-purple-300">
                      Total Entertainment Records
                    </span>
                    <span className="font-semibold text-white">
                      {totalResults.toLocaleString()}+
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-purple-300">
                      Active Music & Film Businesses
                    </span>
                    <span className="font-semibold text-white">
                      {searchResults.length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-purple-300">Database Status</span>
                    <span
                      className={`font-semibold ${
                        databaseConnected ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {databaseConnected ? "Connected ✅" : "Disconnected ❌"}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-purple-300">API Endpoint</span>
                    <span className="font-mono text-sm text-purple-400">
                      {API_BASE_URL}
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-purple-200">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button
                    onClick={() =>
                      window.open(`${API_BASE_URL}/api/health`, "_blank")
                    }
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Test Database Connection
                  </Button>
                  <Button
                    onClick={() => {
                      handleSearch(1);
                    }}
                    variant="outline"
                    className="w-full border-purple-500 text-purple-400 hover:bg-purple-500/10"
                  >
                    Refresh Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entertainment Features Section */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12">
          <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            Verso Air Entertainment Network
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 md:gap-8">
          {entertainmentFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gradient-to-br from-slate-800/50 to-purple-900/30 backdrop-blur-md rounded-xl p-3 sm:p-4 md:p-6 text-center border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 text-white">
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
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-slate-800/90 backdrop-blur-md border-b border-slate-700 p-3 sm:p-4 md:p-6 flex justify-between items-center">
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

              <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300">
                        {selectedBusiness.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-purple-900/30 text-purple-300 border-purple-500/30"
                      >
                        {selectedBusiness.category}
                      </Badge>
                      <div className="flex items-center gap-1 bg-purple-900/50 text-yellow-400 px-2 py-1 rounded text-sm">
                        <Star className="h-3 w-3 fill-current" />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {selectedBusiness.revenue && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">Revenue</div>
                        <div className="text-base sm:text-lg md:text-xl font-bold text-white">
                          €{selectedBusiness.revenue.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedBusiness.employees && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">Employees</div>
                        <div className="text-base sm:text-lg md:text-xl font-bold text-white">
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

                {selectedBusiness.artists &&
                  selectedBusiness.artists.length > 0 && (
                    <div>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2">
                        Featured Artists
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedBusiness.artists.map((artist, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-purple-900/30 text-purple-300 border-purple-500/30"
                          >
                            {artist}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedBusiness.genres &&
                  selectedBusiness.genres.length > 0 && (
                    <div>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2">
                        Music Genres
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedBusiness.genres.map((genre, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-slate-800/50 text-gray-300 border-slate-600"
                          >
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex gap-4 pt-6 border-t border-slate-700">
                  <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Contact Business
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600 hover:bg-slate-800"
                    onClick={() => setShowBusinessDetails(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ScrollToTop />
    </div>
  );
}

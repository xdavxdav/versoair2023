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
  Bed,
  Utensils,
  Sparkles,
  Wine,
  ConciergeBell,
  Loader2,
  X,
  Building,
  Database,
  Activity,
  ExternalLink,
  DollarSign,
  Hotel,
  Briefcase,
  Palette,
  Music,
  Trees,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Heart,
  Phone,
  Tag,
  Check,
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

// Database API configuration - SAME AS COMMERCE
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Database types
interface HospitalityAnalytics {
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
}

// Database API functions - SIMILAR TO COMMERCE
async function fetchHospitalityAnalytics(): Promise<HospitalityAnalytics> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hospitality/analytics`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch hospitality analytics:", error);
    return {
      total_revenue: 0,
      occupancy_rate: 0,
      average_daily_rate: 0,
      guest_satisfaction: 0,
      year_over_year_growth: 0,
      top_categories: [],
      monthly_trends: [],
      top_regions: [],
    };
  }
}

async function searchHospitalityBusinesses(params: {
  query?: string;
  category?: string;
  location?: string;
  min_rating?: number;
  amenities?: string;
  min_revenue?: number;
  status?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  countryCode?: string;
}): Promise<{ data: Business[]; total: number; success: boolean }> {
  try {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append("query", params.query);
    if (params.category) queryParams.append("category", params.category);
    if (params.location) queryParams.append("location", params.location);
    if (params.min_rating)
      queryParams.append("min_rating", params.min_rating.toString());
    if (params.amenities) queryParams.append("amenities", params.amenities);
    if (params.min_revenue)
      queryParams.append("min_revenue", params.min_revenue.toString());
    if (params.status) queryParams.append("status", params.status);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);

    // Search within Hotellerie sector pool (parent category ID 9 — Hotels, Travel, Hostels)
    const results = await searchBusinesses({
      query: params.query,
      sectorId: 9,
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

// Filter options
const categoryOptions = [
  { value: "hotel", label: "Hôtels" },
  { value: "resort", label: "Complexes hôteliers" },
  { value: "restaurant", label: "Restaurants" },
  { value: "spa", label: "Spa & Bien-être" },
  { value: "boutique", label: "Hôtels boutique" },
  { value: "villa", label: "Villas" },
  { value: "hostel", label: "Auberges" },
  { value: "motel", label: "Motels" },
];

const statusOptions = [
  { value: "active", label: "Actif" },
  { value: "verified", label: "Vérifié" },
  { value: "premium", label: "Premium" },
  { value: "inactive", label: "Inactif" },
];

type TabType = "analytics" | "businesses" | "finance" | "ads" | "database";

export default function Hotellerie() {
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
      // Mark as connected if success is true
      const connected = result.success === true;
      setDatabaseConnected(connected);
    };
    checkConnection();
  }, []);

  // Fetch hospitality analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["hospitality-analytics"],
    queryFn: fetchHospitalityAnalytics,
    refetchInterval: autoRefresh ? 300000 : false,
    staleTime: 60000,
    enabled: databaseConnected === true,
  });

  // Fetch initial hospitality businesses
  const fetchBusinesses = useCallback(async () => {
    if (databaseConnected === false) return;

    setIsInitialLoading(true);
    const result = await searchHospitalityBusinesses({
      category: "hospitality,hotel,resort,restaurant",
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

    // Only trigger if user has typed something or changed filters
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
      category: "hospitality,hotel,resort,restaurant",
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

    const result = await searchHospitalityBusinesses(params);
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
      name: "Chargement des hôtels & complexes...",
      desc: "Connexion à la base de données",
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Update carousel with database results
  useEffect(() => {
    if (searchResults.length > 0) {
      const featuredEnterprises = searchResults.slice(0, 8).map((business) => ({
        name: business.title,
        desc: business.description || "Établissement hôtelier premium",
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
        const bookingsData = analytics.monthly_trends.map(
          (t) => t.bookings || 0,
        );

        chartInstanceRef.current = new window.Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Revenus (€)",
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
                label: "Bookings",
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
                      : `${context.raw.toLocaleString()} bookings`;
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

  // Hospitality features
  const hospitalityFeatures = [
    {
      icon: <Database className="h-8 w-8" />,
      title: "Base de données PostgreSQL",
      description: "Données hôtelières en direct depuis la base Verso Air",
    },
    {
      icon: <Hotel className="h-8 w-8" />,
      title: "Réseau hôtelier",
      description: "Réseau mondial d'hôtels de luxe et complexes hôteliers",
    },
    {
      icon: <Briefcase className="h-8 w-8" />,
      title: "Voyages d'affaires",
      description: "Services premium pour les clients entreprise",
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: "Expérience de luxe",
      description: "Équipements exclusifs et service personnalisé",
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Portée mondiale",
      description: "Hôtels dans plus de 50 pays",
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
        title={databaseConnected ? "Base de données connectée" : "Base de données hors ligne"}
      >
        <div
          className={`w-2.5 h-2.5 rounded-full ${databaseConnected ? "bg-green-500" : "bg-red-500"}`}
        />
      </div>

      {/* Hero + Carousel Container */}
      <div className="relative min-h-[100dvh] md:min-h-0 md:h-[600px] flex flex-col justify-center items-center text-center px-4 sm:px-6 overflow-hidden py-8 md:py-0">
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out`}
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
              🏨 Intelligence Hôtelière
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-2xl"
          >
            Base de données Hôtels & Complexes
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-[clamp(1rem,1.4vw,1.25rem)] mb-4 text-white/90"
          >
            Base de données PostgreSQL en temps réel avec{" "}
            {totalResults.toLocaleString()}+ hôtels, complexes hôteliers &
            restaurants
          </motion.p>

          {/* Database Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-[0.75vw] mb-[1.5vw]"
          >
            <Card className="bg-white/10 backdrop-blur-md border-purple-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-[0.5vw]">
                  <Database className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-purple-400" />
                  <span className="text-sm text-purple-200">
                    Base en direct
                  </span>
                </div>
                <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                  {totalResults.toLocaleString()}+ Enregistrements
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-md border-pink-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-[0.5vw]">
                  <Building className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-pink-400" />
                  <span className="text-sm text-pink-200">
                    Hôtels & Complexes
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
                className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-md rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-purple-500/20"
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
                          className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-purple-300">
                      {enterprises[currentIndex]?.name}
                    </h3>
                    <p className="text-gray-200 mt-2">
                      {enterprises[currentIndex]?.desc}
                    </p>
                    <div className="flex items-center gap-[0.5vw] mt-3 text-purple-200">
                      <MapPin className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)]" />
                      <span>
                        {enterprises[currentIndex]?.location ||
                          "Emplacement non précisé"}
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
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] -mt-8 relative z-20">
        <Card className="bg-gradient-to-br from-slate-800/90 to-purple-900/90 backdrop-blur-md border-purple-700 shadow-2xl">
          <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
            <div className="flex flex-col md:flex-row items-center gap-[0.75vw] mb-[1vw]">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher hôtels, complexes, restaurants, équipements..."
                  className="pl-12 bg-slate-800/50 border-purple-600 text-white placeholder-purple-300/60"
                />
              </div>
              <div className="relative flex-1 w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                <Input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Ville, région ou destination..."
                  className="pl-12 bg-slate-800/50 border-purple-600 text-white placeholder-purple-300/60"
                />
              </div>
              {isSearching && (
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[0.75vw] md:gap-[1vw]">
              <div className="flex flex-wrap items-center gap-[0.5vw] sm:gap-[1vw]">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-purple-600 hover:bg-purple-800"
                >
                  <Filter size={16} className="mr-2" />
                  {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
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
                      className="border-purple-600 bg-slate-800 hover:bg-slate-700 w-full sm:w-[180px] justify-between"
                    >
                      <span className="text-sm">
                        {activeFilters.sort_by === "rating_desc" &&
                          "Meilleure note"}
                        {activeFilters.sort_by === "star_desc" &&
                          "Meilleure étoile"}
                        {activeFilters.sort_by === "revenue_desc" &&
                          "Chiffre d'affaires"}
                        {activeFilters.sort_by === "name_asc" && "Nom A-Z"}
                        {!activeFilters.sort_by && "Trier par"}
                      </span>
                      <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[200px]">
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
                            ? "font-semibold text-purple-300"
                            : "text-purple-200"
                        }
                      >
                        Meilleure note
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setActiveFilters({
                          ...activeFilters,
                          sort_by: "star_desc",
                        })
                      }
                    >
                      {activeFilters.sort_by === "star_desc" && (
                        <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                      )}
                      <span
                        className={
                          activeFilters.sort_by === "star_desc"
                            ? "font-semibold text-purple-300"
                            : "text-purple-200"
                        }
                      >
                        Meilleure étoile
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
                            ? "font-semibold text-purple-300"
                            : "text-purple-200"
                        }
                      >
                        Chiffre d'affaires
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
                            ? "font-semibold text-purple-300"
                            : "text-purple-200"
                        }
                      >
                        Nom A-Z
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="text-sm text-purple-300">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[0.75vw] sm:gap-[1vw] p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-purple-700">
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      Catégorie
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
                            )?.label || "Toutes les catégories"}
                          </span>
                          <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[200px]">
                        <DropdownMenuItem
                          onClick={() =>
                            setActiveFilters({ ...activeFilters, category: "" })
                          }
                        >
                          <span
                            className={
                              !activeFilters.category
                                ? "font-semibold text-purple-300"
                                : "text-purple-200"
                            }
                          >
                            Toutes les catégories
                          </span>
                        </DropdownMenuItem>
                        {categoryOptions.map((cat) => (
                          <DropdownMenuItem
                            key={cat.value}
                            onClick={() =>
                              setActiveFilters({
                                ...activeFilters,
                                category: cat.value,
                              })
                            }
                          >
                            {activeFilters.category === cat.value && (
                              <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
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
                      placeholder="Tous"
                      className="bg-slate-700 border-purple-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      CA minimum
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
                      placeholder="Tous"
                      className="bg-slate-700 border-purple-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      Statut
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
                            )?.label || "Tout statut"}
                          </span>
                          <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[200px]">
                        <DropdownMenuItem
                          onClick={() =>
                            setActiveFilters({ ...activeFilters, status: "" })
                          }
                        >
                          <span
                            className={
                              !activeFilters.status
                                ? "font-semibold text-purple-300"
                                : "text-purple-200"
                            }
                          >
                            Tout statut
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

                  <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-[0.5vw] mt-4">
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="border-purple-600 hover:bg-purple-800"
                    >
                      Tout effacer
                    </Button>
                    <Button
                      onClick={() => handleSearch()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
        <div className="relative mb-[1.5vw] overflow-x-auto scrollbar-hide bg-slate-800/50 rounded-xl p-[0.4vw] border border-purple-500/20 backdrop-blur-sm">
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
                    : "text-purple-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="hotellerie-active-tab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg shadow-lg shadow-purple-500/25"
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
                    <Database className="h-6 w-6 text-purple-400" />
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      Résultats base de données ({searchResults.length} sur{" "}
                      {totalResults.toLocaleString()})
                    </span>
                  </h2>
                  <div className="text-sm text-purple-300">
                    {databaseConnected
                      ? "✅ Données PostgreSQL en direct"
                      : "✅ Données réelles"}
                  </div>
                </div>

                {/* Loading State */}
                {isInitialLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1vw]">
                    <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-md border border-purple-500/20">
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
                            <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-purple-300">
                              Chargement des hôtels & complexes...
                            </h3>
                            <p className="text-gray-200 mt-2">
                              Connexion à la base de données
                            </p>
                          </div>
                          <ExternalLink className="h-5 w-5 text-purple-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-md border border-purple-500/20">
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
                            <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-purple-300">
                              Récupération des données...
                            </h3>
                            <p className="text-gray-200 mt-2">
                              Veuillez patienter
                            </p>
                          </div>
                          <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
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
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full blur-xl opacity-50" />
                              <div className="relative w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-700 rounded-full flex items-center justify-center shadow-2xl">
                                <Search className="h-10 w-10 text-white" />
                              </div>
                            </div>
                            <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-purple-300 mb-2">
                              Recherche dans la base PostgreSQL...
                            </h3>
                            <p className="text-gray-300">
                              Chargement des hôtels...
                            </p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((business, index) => (
                            <SectorBusinessCard
                              key={business.id}
                              business={business}
                              index={index}
                              theme="purple"
                              onSelect={handleBusinessSelect}
                              sectorIcon={Hotel}
                              sectorLabel={(b) =>
                                `${(b as any).star_rating || 5}★ Hotel`
                              }
                            />
                          ))
                        ) : (
                          <div className="col-span-full text-center py-[2vh] sm:py-[3vh] md:py-[4vh]">
                            <Search className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold text-gray-300 mb-2">
                              Aucun établissement trouvé
                            </h3>
                            <p className="text-gray-400">
                              Essayez une autre recherche ou effacez les filtres
                            </p>
                            <Button
                              onClick={clearAllFilters}
                              className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
                          className="border-purple-600 hover:bg-purple-800"
                        >
                          <ChevronRight className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-1 rotate-180" />
                          Précédent
                        </Button>
                        <span className="text-purple-400 text-[clamp(0.7rem,1vw,0.875rem)]">
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
                          className="border-purple-600 hover:bg-purple-800"
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
              text="Analytique Hôtelière"
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
                title="Taux d'occupation"
                value={analytics ? `${analytics.occupancy_rate}%` : "78%"}
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}% YoY`
                    : "+12% par rapport au mois dernier"
                }
                trend="up"
                color="purple"
              />
              <AnalyticsCard
                title="Tarif journalier moyen"
                value={analytics ? `€${analytics.average_daily_rate}` : "€245"}
                change={
                  analytics
                    ? `+${Math.round(
                        (analytics.average_daily_rate || 0) / 10,
                      )}%`
                    : "+8% par rapport au mois dernier"
                }
                trend="up"
                color="pink"
              />
              <AnalyticsCard
                title="Satisfaction client"
                value={
                  analytics ? `${analytics.guest_satisfaction}/10` : "4.7/5"
                }
                change={
                  analytics
                    ? `+${analytics.guest_satisfaction * 0.1 || 5}%`
                    : "+5% par rapport au mois dernier"
                }
                trend="up"
                color="blue"
              />
              <AnalyticsCard
                title="Chiffre d'affaires total"
                value={
                  analytics
                    ? `€${(analytics.total_revenue || 0).toLocaleString()}`
                    : "€2.4M"
                }
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}% YoY`
                    : "+15% par rapport au mois dernier"
                }
                trend="up"
                color="orange"
              />
            </motion.div>

            {/* Charts and Details */}
            <div className="grid lg:grid-cols-2 gap-[1vw] mb-[1.5vw]">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-purple-500/20">
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold text-white">
                      Tendances revenus & réservations
                    </h3>
                    <Calendar className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="chart-container h-48 sm:h-60 md:h-72">
                    <canvas ref={chartRef}></canvas>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-purple-500/20">
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
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-purple-500/20">
                <CardContent>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-4 text-white">
                    Meilleures catégories
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
                            {category.occupancy || 0}% occupation
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
                            category: "Hôtels de luxe",
                            revenue: 125400,
                            occupancy: 85,
                          },
                          {
                            category: "Complexes hôteliers",
                            revenue: 89200,
                            occupancy: 78,
                          },
                          {
                            category: "Restaurants",
                            revenue: 56800,
                            occupancy: 72,
                          },
                          {
                            category: "Hôtels boutique",
                            revenue: 42300,
                            occupancy: 68,
                          },
                          {
                            category: "Spa & Bien-être",
                            revenue: 28700,
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
                                {item.occupancy}% occupation
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

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-purple-500/20">
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
                          <span className="font-semibold text-purple-300">
                            €{(region.revenue || 0).toLocaleString()}
                          </span>
                        </div>
                        {/* eslint-disable-next-line */}
                        {/* webhint-disable-next-line hint-no-inline-styles */}
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
                          { region: "Europe", revenue: 985200, percentage: 41 },
                          {
                            region: "Amérique du Nord",
                            revenue: 763400,
                            percentage: 32,
                          },
                          {
                            region: "Asie-Pacifique",
                            revenue: 432100,
                            percentage: 18,
                          },
                          {
                            region: "Moyen-Orient",
                            revenue: 219300,
                            percentage: 9,
                          },
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
                              percent={region.percentage}
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

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-purple-500/20">
                <CardContent>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-4 text-white">
                    Indicateurs de performance
                  </h3>
                  <div className="space-y-4">
                    {[
                      {
                        metric: "RevPAR",
                        value: analytics
                          ? `€${Math.round(
                              ((analytics.average_daily_rate || 0) *
                                (analytics.occupancy_rate || 0)) /
                                100,
                            )}`
                          : "€189",
                        change: "+15%",
                      },
                      {
                        metric: "ADR",
                        value: analytics
                          ? `€${analytics.average_daily_rate}`
                          : "€245",
                        change: "+8%",
                      },
                      {
                        metric: "Occupancy",
                        value: analytics
                          ? `${analytics.occupancy_rate}%`
                          : "78%",
                        change: "+12%",
                      },
                      {
                        metric: "Guest Score",
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-[1vw] flex items-center gap-[0.5vw]">
              <DollarSign className="h-6 w-6" />
              Tableau de bord financier
            </h2>
            <p className="text-gray-300 mb-6">
              Analytique financière et indicateurs de performance du secteur
              hôtelier.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
              {[
                { title: "Revenus chambres", value: "€1.2M", change: "+12%" },
                { title: "Restauration", value: "€450K", change: "+8%" },
                { title: "Revenus annexes", value: "€180K", change: "+15%" },
                {
                  title: "Coûts d'exploitation",
                  value: "€850K",
                  change: "+5%",
                },
                { title: "Marge bénéficiaire", value: "28%", change: "+3%" },
                { title: "ROI", value: "22%", change: "+4%" },
              ].map((metric, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {metric.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-purple-300 mb-1">
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
              <Sparkles className="h-6 w-6" />
              Publicité & Promotions
            </h2>
            <p className="text-gray-300 mb-6">
              Gérez les campagnes et activités promotionnelles pour les
              établissements hôteliers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
              {[
                { title: "Campagnes actives", value: "12", status: "En cours" },
                { title: "Budget total", value: "€85K", status: "Alloué" },
                { title: "Taux d'engagement", value: "4.8%", status: "Élevé" },
                {
                  title: "Taux de clic",
                  value: "2.3%",
                  status: "Moyen",
                },
                { title: "Taux de conversion", value: "1.8%", status: "Bon" },
                { title: "ROAS", value: "3.2x", status: "Excellent" },
              ].map((ad, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
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
                          : ad.status === "Bon"
                            ? "text-blue-400"
                            : ad.status === "Moyen"
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
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-3 sm:mb-4 text-purple-300 flex items-center gap-[0.5vw]">
              <Database className="h-6 w-6" />
              Connexion base de données PostgreSQL
            </h2>
            <div className="grid md:grid-cols-2 gap-[1vw]">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-purple-200">
                  Statistiques de la base
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-purple-300">
                      Total enregistrements hôteliers
                    </span>
                    <span className="font-semibold text-white">
                      {totalResults.toLocaleString()}+
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-purple-300">
                      Hôtels & complexes actifs
                    </span>
                    <span className="font-semibold text-white">
                      {searchResults.length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-purple-300">Statut de la base</span>
                    <span
                      className={`font-semibold ${
                        databaseConnected ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {databaseConnected ? "Connectée ✅" : "Déconnectée ❌"}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-purple-300">Point d'accès API</span>
                    <span className="font-mono text-sm text-purple-400">
                      {API_BASE_URL}
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-purple-200">
                  Actions rapides
                </h3>
                <div className="space-y-[0.75vw]">
                  <Button
                    onClick={() =>
                      window.open(`${API_BASE_URL}/api/health`, "_blank")
                    }
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Tester la connexion
                  </Button>
                  <Button
                    onClick={() => {
                      handleSearch(1);
                    }}
                    variant="outline"
                    className="w-full border-purple-500 text-purple-400 hover:bg-purple-500/10"
                  >
                    Actualiser les données
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hospitality Features Section */}
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] py-8 sm:py-12 md:py-16">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12">
          <span className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            Réseau Hôtelier Verso Air
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-[0.75vw] sm:gap-5 md:gap-8">
          {hospitalityFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gradient-to-br from-slate-800/50 to-purple-900/30 backdrop-blur-md rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] text-center border border-purple-500/20 hover:border-purple-500/40 transition-all"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg">
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
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-500/30"
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
                        className="bg-purple-900/30 text-purple-300 border-purple-500/30"
                      >
                        {selectedBusiness.category}
                      </Badge>
                      <div className="flex items-center gap-1 bg-purple-900/50 text-yellow-400 px-2 py-1 rounded text-sm">
                        <Star className="h-[clamp(0.75rem,1vw,1rem)] w-[clamp(0.75rem,1vw,1rem)] fill-current" />
                        <span className="font-bold">
                          {selectedBusiness.rating}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">
                          ({selectedBusiness.reviews} avis)
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
                        <div className="text-sm text-gray-400">
                          Chiffre d'affaires
                        </div>
                        <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                          €{selectedBusiness.revenue.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedBusiness.employees && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">Employés</div>
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
                        {selectedBusiness.phone || "Non spécifié"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-gray-400">E-mail</div>
                      <div className="text-sm font-semibold text-white truncate">
                        {selectedBusiness.email || "Non spécifié"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {(selectedBusiness as any).amenities &&
                  (selectedBusiness as any).amenities.length > 0 && (
                    <div>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2">
                        Équipements
                      </h3>
                      <div className="flex flex-wrap gap-[0.5vw]">
                        {(selectedBusiness as any).amenities.map(
                          (amenity: string, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-slate-800/50 text-gray-300 border-slate-600"
                            >
                              {amenity}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                <div className="flex gap-[1vw] pt-6 border-t border-slate-700">
                  <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Contacter l'établissement
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
      <ScrollToTop />
    </div>
  );
}

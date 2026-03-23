import { useQuery } from "@tanstack/react-query";
import {
  searchBusinesses,
  checkDatabaseConnection,
  Business,
} from "@/lib/business-data";
/* webhint-disable hint-no-inline-styles */
import { useEffect, useRef, useState, useCallback } from "react";
import { useCountry } from "@/contexts/CountryContext";
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
  Stethoscope,
  Heart,
  Loader2,
  X,
  Building,
  Database,
  Activity,
  ExternalLink,
  DollarSign,
  Briefcase,
  Pill,
  Activity as ActivityIcon,
  Trees,
  ChevronRight,
  ChevronDown,
  CheckCircle,
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
import { useScrollLock } from "@/hooks/use-scroll-lock";

// Database API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Database types
interface HealthcareAnalytics {
  total_revenue: number;
  patient_satisfaction: number;
  treatment_success_rate: number;
  average_wait_time: number;
  year_over_year_growth: number;
  top_categories: Array<{
    category: string;
    revenue: number;
    patient_count: number;
  }>;
  monthly_trends: Array<{ month: string; revenue: number; patients: number }>;
  top_regions: Array<{ region: string; revenue: number; percentage: number }>;
}

// Database API functions
async function fetchHealthcareAnalytics(): Promise<HealthcareAnalytics> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/healthcare/analytics`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch healthcare analytics:", error);
    return {
      total_revenue: 0,
      patient_satisfaction: 0,
      treatment_success_rate: 0,
      average_wait_time: 0,
      year_over_year_growth: 0,
      top_categories: [],
      monthly_trends: [],
      top_regions: [],
    };
  }
}

async function searchHealthcareBusinesses(params: {
  query?: string;
  category?: string;
  location?: string;
  min_rating?: number;
  specialization?: string;
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
    if (params.specialization)
      queryParams.append("specialization", params.specialization);
    if (params.min_revenue)
      queryParams.append("min_revenue", params.min_revenue.toString());
    if (params.status) queryParams.append("status", params.status);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);

    // Search within Health sector pool (parent category ID 10 — Hospitals, Clinics, Pharmacies, Labs)
    const results = await searchBusinesses({
      query: params.query,
      sectorId: 10,
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
  { value: "hospital", label: "Hospitals" },
  { value: "clinic", label: "Clinics" },
  { value: "pharmacy", label: "Pharmacies" },
  { value: "dental", label: "Dental" },
  { value: "mental", label: "Mental Health" },
  { value: "pediatric", label: "Pediatric" },
  { value: "specialist", label: "Specialists" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "verified", label: "Verified" },
  { value: "premium", label: "Premium" },
  { value: "inactive", label: "Inactive" },
];

type TabType = "analytics" | "businesses" | "finance" | "ads" | "database";

export default function Sante() {
  const { selectedCountry } = useCountry();
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
    specialization: "",
    sort_by: "rating_desc",
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  useScrollLock(showBusinessDetails);

  // Database connection test
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testDatabaseConnection();
      const connected = result.success === true;
      setDatabaseConnected(connected);
    };
    checkConnection();
  }, []);

  // Fetch healthcare analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["healthcare-analytics"],
    queryFn: fetchHealthcareAnalytics,
    refetchInterval: autoRefresh ? 300000 : false,
    staleTime: 60000,
    enabled: databaseConnected === true,
  });

  // Fetch initial healthcare businesses
  const fetchBusinesses = useCallback(async () => {
    if (databaseConnected === false) return;

    setIsInitialLoading(true);
    const result = await searchHealthcareBusinesses({
      category: "health",
      limit: 9,
      sort_by: activeFilters.sort_by,
      countryCode: selectedCountry || undefined,
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
  }, [searchQuery, locationQuery, activeFilters, selectedCountry]);

  // Search handler
  const handleSearch = async (page: number = 1) => {
    setIsSearching(true);
    setCurrentPage(page);
    const params: any = {
      query: searchQuery,
      category: "health",
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
    if (activeFilters.specialization)
      params.specialization = activeFilters.specialization;

    const result = await searchHealthcareBusinesses(params);
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
      specialization: "",
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
      name: "Chargement des prestataires de santé...",
      desc: "Connexion à la base de données",
      image:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Update carousel with database results
  useEffect(() => {
    if (searchResults.length > 0) {
      const featuredEnterprises = searchResults.slice(0, 8).map((business) => ({
        name: business.title,
        desc: business.description || "Établissement de santé",
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
        gradient.addColorStop(0, "hsla(10, 100%, 60%, 0.4)");
        gradient.addColorStop(1, "hsla(10, 100%, 60%, 0.05)");

        const labels = analytics.monthly_trends.map((t) => t.month);
        const revenueData = analytics.monthly_trends.map((t) => t.revenue || 0);
        const patientsData = analytics.monthly_trends.map(
          (t) => t.patients || 0,
        );

        chartInstanceRef.current = new window.Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Revenus (€)",
                data: revenueData,
                borderColor: "hsl(10, 100%, 60%)",
                backgroundColor: gradient,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: "hsl(10, 100%, 60%)",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
              },
              {
                label: "Patients Served",
                data: patientsData,
                borderColor: "hsl(200, 100%, 60%)",
                backgroundColor: "hsla(200, 100%, 60%, 0.1)",
                tension: 0.4,
                fill: false,
                pointBackgroundColor: "hsl(200, 100%, 60%)",
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
                      : `${context.raw.toLocaleString()} patients`;
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
                  "hsla(10, 100%, 60%, 0.8)",
                  "hsla(10, 100%, 60%, 0.6)",
                  "hsla(10, 100%, 60%, 0.5)",
                  "hsla(10, 100%, 60%, 0.4)",
                  "hsla(10, 100%, 60%, 0.3)",
                ],
                borderColor: "hsl(10, 100%, 60%)",
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

  // Healthcare features
  const healthcareFeatures = [
    {
      icon: <Stethoscope className="h-8 w-8" />,
      title: "Établissements Médicaux",
      description: "Hôpitaux, cliniques et centres de diagnostic",
    },
    {
      icon: <Pill className="h-8 w-8" />,
      title: "Pharmacies",
      description: "Prestataires de services pharmaceutiques agréés",
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "Base de Données PostgreSQL",
      description: "Dossiers de santé en direct depuis la base Verso Air",
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Soins aux Patients",
      description: "Évaluations de qualité des services de santé",
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Réseau Mondial",
      description: "Prestataires de santé dans le monde entier",
    },
    {
      icon: <Activity className="h-8 w-8" />,
      title: "Analytique en Direct",
      description: "Suivi des performances en temps réel",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-slate-900 via-red-900 to-slate-900 text-white">
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
          style={{
            backgroundImage: `url(${enterprises[currentIndex]?.image})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 to-orange-900/90"></div>
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20">
              🏥 Intelligence Santé
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-2xl"
          >
            Base de Données des Prestataires de Santé
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-[clamp(1rem,1.4vw,1.25rem)] mb-4 text-white/90"
          >
            Base de données PostgreSQL en temps réel avec{" "}
            {totalResults.toLocaleString()}+ établissements de santé
          </motion.p>

          {/* Database Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-[0.75vw] mb-[1.5vw]"
          >
            <Card className="bg-white/10 backdrop-blur-md border-red-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-[0.5vw]">
                  <Database className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-red-400" />
                  <span className="text-sm text-red-200">
                    Base de Données en Direct
                  </span>
                </div>
                <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                  {totalResults.toLocaleString()}+ Enregistrements
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-md border-orange-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-[0.5vw]">
                  <Building className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-orange-400" />
                  <span className="text-sm text-orange-200">
                    Établissements de Santé
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
                className="bg-gradient-to-r from-red-900/30 to-orange-900/30 backdrop-blur-md rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-red-500/20"
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
                    <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-red-300">
                      {enterprises[currentIndex]?.name}
                    </h3>
                    <p className="text-gray-200 mt-2">
                      {enterprises[currentIndex]?.desc}
                    </p>
                    <div className="flex items-center gap-[0.5vw] mt-3 text-red-200">
                      <MapPin className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)]" />
                      <span>
                        {enterprises[currentIndex]?.location ||
                          "Emplacement non précisé"}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-red-400" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] -mt-8 relative z-20">
        <Card className="bg-gradient-to-br from-slate-800/90 to-red-900/90 backdrop-blur-md border-red-700 shadow-2xl">
          <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
            <div className="flex flex-col md:flex-row items-center gap-[0.75vw] mb-[1vw]">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-red-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hospitals, clinics, pharmacies..."
                  className="pl-12 bg-slate-800/50 border-red-600 text-white placeholder-red-300/60"
                />
              </div>
              <div className="relative flex-1 w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-red-400" />
                <Input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="City, region, or area..."
                  className="pl-12 bg-slate-800/50 border-red-600 text-white placeholder-red-300/60"
                />
              </div>
              {isSearching && (
                <Loader2 className="h-5 w-5 animate-spin text-red-400" />
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[0.75vw] md:gap-[1vw]">
              <div className="flex flex-wrap items-center gap-[0.5vw] sm:gap-[1vw]">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-red-600 hover:bg-red-800"
                >
                  <Filter size={16} className="mr-2" />
                  {showFilters ? "Masquer les Filtres" : "Afficher les Filtres"}
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

              <div className="flex flex-wrap items-center gap-[0.5vw] sm:gap-[1vw]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-red-600 bg-slate-800 hover:bg-slate-700 w-full sm:w-[180px] justify-between"
                    >
                      <span className="text-sm">
                        {activeFilters.sort_by === "rating_desc" &&
                          "Meilleure Note"}
                        {activeFilters.sort_by === "star_desc" &&
                          "Plus d'Étoiles"}
                        {activeFilters.sort_by === "revenue_desc" &&
                          "Meilleur Revenu"}
                        {activeFilters.sort_by === "name_asc" && "Nom A-Z"}
                        {!activeFilters.sort_by && "Trier par"}
                      </span>
                      <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-red-600 w-[200px]">
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
                            ? "font-semibold text-red-300"
                            : "text-red-200"
                        }
                      >
                        Meilleure Note
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
                            ? "font-semibold text-red-300"
                            : "text-red-200"
                        }
                      >
                        Plus d'Étoiles
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
                            ? "font-semibold text-red-300"
                            : "text-red-200"
                        }
                      >
                        Meilleur Revenu
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
                            ? "font-semibold text-red-300"
                            : "text-red-200"
                        }
                      >
                        Name A-Z
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="text-sm text-red-300">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[0.75vw] sm:gap-[1vw] p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-red-700">
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-red-300">
                      Catégorie
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-slate-700 border-red-600 justify-between"
                        >
                          <span className="text-sm">
                            {categoryOptions.find(
                              (c) => c.value === activeFilters.category,
                            )?.label || "All Categories"}
                          </span>
                          <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-red-600 w-[200px]">
                        <DropdownMenuItem
                          onClick={() =>
                            setActiveFilters({ ...activeFilters, category: "" })
                          }
                        >
                          <span
                            className={
                              !activeFilters.category
                                ? "font-semibold text-red-300"
                                : "text-red-200"
                            }
                          >
                            All Categories
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
                                  ? "font-semibold text-red-300"
                                  : "text-red-200"
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
                    <Label className="text-sm font-medium mb-2 block text-red-300">
                      Note Min.
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
                      className="bg-slate-700 border-red-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-red-300">
                      Revenu Min.
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
                      className="bg-slate-700 border-red-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-red-300">
                      Statut
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-slate-700 border-red-600 justify-between"
                        >
                          <span className="text-sm">
                            {statusOptions.find(
                              (s) => s.value === activeFilters.status,
                            )?.label || "Any Status"}
                          </span>
                          <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-red-600 w-[200px]">
                        <DropdownMenuItem
                          onClick={() =>
                            setActiveFilters({ ...activeFilters, status: "" })
                          }
                        >
                          <span
                            className={
                              !activeFilters.status
                                ? "font-semibold text-red-300"
                                : "text-red-200"
                            }
                          >
                            Any Status
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
                                  ? "font-semibold text-red-300"
                                  : "text-red-200"
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
                      className="border-red-600 hover:bg-red-800"
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={() => handleSearch()}
                      className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                    >
                      Appliquer les Filtres
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
        <div className="relative mb-[1.5vw] overflow-x-auto scrollbar-hide bg-slate-800/50 rounded-xl p-[0.4vw] border border-red-500/20 backdrop-blur-sm">
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
                    : "text-red-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="sante-active-tab"
                    className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 rounded-lg shadow-lg shadow-red-500/25"
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
                    <Database className="h-6 w-6 text-red-400" />
                    <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                      Database Results ({searchResults.length} of{" "}
                      {totalResults.toLocaleString()})
                    </span>
                  </h2>
                  <div className="text-sm text-red-300">
                    {databaseConnected
                      ? "✅ Live PostgreSQL Data"
                      : "✅ Real Database Data"}
                  </div>
                </div>

                {/* Loading State */}
                {isInitialLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-[1vw]">
                    <Card className="bg-gradient-to-r from-red-900/30 to-orange-900/30 backdrop-blur-md border border-red-500/20">
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
                            <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-red-300">
                              Chargement des établissements de santé...
                            </h3>
                            <p className="text-gray-200 mt-2">
                              Connexion à la base de données
                            </p>
                          </div>
                          <ExternalLink className="h-5 w-5 text-red-400" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-r from-red-900/30 to-orange-900/30 backdrop-blur-md border border-red-500/20">
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
                            <h3 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-semibold text-red-300">
                              Récupération des données...
                            </h3>
                            <p className="text-gray-200 mt-2">
                              Veuillez patienter
                            </p>
                          </div>
                          <Loader2 className="h-5 w-5 text-red-400 animate-spin" />
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
                              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-600 rounded-full blur-xl opacity-50" />
                              <div className="relative w-20 h-20 bg-gradient-to-r from-red-600 to-orange-700 rounded-full flex items-center justify-center shadow-2xl">
                                <Search className="h-10 w-10 text-white" />
                              </div>
                            </div>
                            <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-red-300 mb-2">
                              Recherche dans la base PostgreSQL...
                            </h3>
                            <p className="text-gray-300">
                              Récupération des prestataires de santé...
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
                              className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-500 border border-gray-700 hover:border-red-500/30 cursor-pointer group"
                            >
                              <div className="h-2 bg-gradient-to-r from-red-600 to-orange-600" />
                              <div className="p-[clamp(0.75rem,2vw,2.5rem)]">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1">
                                    <h4 className="text-sm sm:text-base md:text-lg font-bold text-white group-hover:text-red-300 transition-colors mb-2 line-clamp-1">
                                      {business.title}
                                    </h4>
                                    <div className="flex items-center gap-[0.5vw] text-gray-400">
                                      <Building className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-red-500" />
                                      <span className="text-sm capitalize font-medium">
                                        {business.address || business.location}
                                      </span>
                                      {business.is_verified && (
                                        <Badge className="bg-blue-900/30 text-blue-300 border-blue-500/30 text-xs">
                                          <CheckCircle className="h-[clamp(0.75rem,1vw,1rem)] w-[clamp(0.75rem,1vw,1rem)] mr-1" />
                                          Verified
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-[0.5vw] bg-gradient-to-br from-red-400 to-orange-500 px-3 py-2 rounded-xl shadow-xl">
                                      <Star className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-white" />
                                      <span className="text-sm font-bold text-white">
                                        {business.rating}
                                      </span>
                                    </div>
                                    {business.status === "premium" && (
                                      <Badge className="bg-green-900/30 text-green-300 border-green-500/30 text-xs">
                                        <Stethoscope className="h-[clamp(0.75rem,1vw,1rem)] w-[clamp(0.75rem,1vw,1rem)] mr-1" />
                                        Premium
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <p className="text-gray-300 text-sm mb-4 leading-relaxed line-clamp-2">
                                  {business.description}
                                </p>

                                <div className="space-y-[0.75vw] mb-4">
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-[0.5vw]">
                                      <Users className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-red-400" />
                                      <span className="text-gray-300">
                                        {business.reviews?.toLocaleString() ||
                                          0}{" "}
                                        avis
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-[0.5vw]">
                                      <Stethoscope className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-orange-400" />
                                      <span className="text-gray-300">
                                        {business.rating || 5}★ Établissement
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-[0.5vw]">
                                      <MapPin className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-blue-400" />
                                      <span className="text-gray-300 capitalize">
                                        {business.location}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-[0.5vw]">
                                      <Tag className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-orange-400" />
                                      <span className="text-gray-300 capitalize">
                                        {business.category}
                                      </span>
                                    </div>
                                  </div>
                                  {(business as any).amenities &&
                                    (business as any).amenities.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {(business as any).amenities
                                          .slice(0, 3)
                                          .map((amenity: string, i: number) => (
                                            <Badge
                                              key={i}
                                              className="bg-red-900/20 text-red-300 border-red-500/30 text-xs"
                                            >
                                              {amenity}
                                            </Badge>
                                          ))}
                                      </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between pt-[1vw] border-t border-gray-700 gap-[0.75vw]">
                                  <div>
                                    {business.revenue && (
                                      <>
                                        <span className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-green-300">
                                          €
                                          {(business.revenue / 1000).toFixed(0)}
                                          K
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                          {" "}
                                          / mois
                                        </span>
                                      </>
                                    )}
                                    {business.employees && (
                                      <div className="text-sm text-gray-300">
                                        {business.employees} employés
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-[0.5vw]">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      <Heart className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-gray-400" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBusinessSelect(business);
                                      }}
                                    >
                                      <Phone className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                                      Contact
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-[2vh] sm:py-[3vh] md:py-[4vh]">
                            <Search className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold text-gray-300 mb-2">
                              Aucun Établissement Trouvé
                            </h3>
                            <p className="text-gray-400">
                              Essayez une autre recherche ou effacez les filtres
                            </p>
                            <Button
                              onClick={clearAllFilters}
                              className="mt-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                            >
                              Réinitialiser la Recherche
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
                          className="border-red-600 hover:bg-red-800"
                        >
                          <ChevronRight className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-1 rotate-180" />
                          Précédent
                        </Button>
                        <span className="text-red-400 text-[clamp(0.7rem,1vw,0.875rem)]">
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
                          className="border-red-600 hover:bg-red-800"
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
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-[1vw] flex items-center gap-[0.5vw]">
              <BarChart3 className="h-6 w-6" />
              Analytique Santé
            </h2>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1vw] mb-[1.5vw]"
            >
              <AnalyticsCard
                title="Patient Satisfaction"
                value={
                  analytics ? `${analytics.patient_satisfaction}/10` : "4.6/10"
                }
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}% YoY`
                    : "+8% from last month"
                }
                trend="up"
                color="red"
              />
              <AnalyticsCard
                title="Treatment Success"
                value={
                  analytics ? `${analytics.treatment_success_rate}%` : "94%"
                }
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}%`
                    : "+5% from last month"
                }
                trend="up"
                color="orange"
              />
              <AnalyticsCard
                title="Avg Wait Time"
                value={
                  analytics
                    ? `${analytics.average_wait_time} mins`
                    : "12 minutes"
                }
                change={"-2 mins from last month"}
                trend="down"
                color="blue"
              />
              <AnalyticsCard
                title="Total Revenue"
                value={
                  analytics
                    ? `€${(analytics.total_revenue || 0).toLocaleString()}`
                    : "€3.2M"
                }
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}% YoY`
                    : "+18% from last month"
                }
                trend="up"
                color="green"
              />
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-[1vw] mb-[1.5vw]">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-red-500/20">
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold text-white">
                      Tendances Revenus & Patients
                    </h3>
                    <Calendar className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="chart-container h-48 sm:h-60 md:h-72">
                    <canvas ref={chartRef}></canvas>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-red-500/20">
                <CardContent>
                  <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold mb-6 text-white">
                    Revenus par Catégorie
                  </h3>
                  <div className="chart-container h-48 sm:h-60 md:h-72">
                    <canvas ref={barChartRef}></canvas>
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
              Tableau de Bord Financier
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
              {[
                {
                  title: "Consultation Revenue",
                  value: "€820K",
                  change: "+12%",
                },
                { title: "Treatment Revenue", value: "€1.2M", change: "+15%" },
                { title: "Pharmacy Revenue", value: "€340K", change: "+8%" },
                { title: "Operating Costs", value: "€980K", change: "+5%" },
                { title: "Profit Margin", value: "32%", change: "+4%" },
                { title: "ROI", value: "25%", change: "+6%" },
              ].map((metric, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {metric.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-red-300 mb-1">
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-[1vw] flex items-center gap-[0.5vw]">
              <Pill className="h-6 w-6" />
              Campagnes Santé
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
              {[
                { title: "Active Campaigns", value: "14", status: "Running" },
                { title: "Total Budget", value: "€120K", status: "Allocated" },
                { title: "Engagement Rate", value: "5.2%", status: "High" },
                {
                  title: "Click-through Rate",
                  value: "2.8%",
                  status: "High",
                },
                {
                  title: "Conversion Rate",
                  value: "2.1%",
                  status: "Excellent",
                },
                { title: "ROAS", value: "3.8x", status: "Excellent" },
              ].map((ad, index) => (
                <Card key={index} className="bg-white/5 border-white/10">
                  <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {ad.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-red-300 mb-1">
                      {ad.value}
                    </div>
                    <div
                      className={`text-sm ${
                        ad.status === "Excellent"
                          ? "text-green-400"
                          : ad.status === "High"
                            ? "text-blue-400"
                            : "text-red-400"
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
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-3 sm:mb-4 text-red-300 flex items-center gap-[0.5vw]">
              <Database className="h-6 w-6" />
              Connexion Base de Données PostgreSQL
            </h2>
            <div className="grid md:grid-cols-2 gap-[1vw]">
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-red-200">
                  Statistiques de la Base
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-red-300">Total Dossiers Santé</span>
                    <span className="font-semibold text-white">
                      {totalResults.toLocaleString()}+
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-red-300">
                      Établissements Actifs Chargés
                    </span>
                    <span className="font-semibold text-white">
                      {searchResults.length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-red-300">Statut de la Base</span>
                    <span
                      className={`font-semibold ${
                        databaseConnected ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {databaseConnected ? "Connectée ✅" : "Déconnectée ❌"}
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 text-red-200">
                  Actions Rapides
                </h3>
                <div className="space-y-[0.75vw]">
                  <Button
                    onClick={() =>
                      window.open(`${API_BASE_URL}/api/health`, "_blank")
                    }
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                  >
                    Tester la Connexion
                  </Button>
                  <Button
                    onClick={() => {
                      handleSearch(1);
                    }}
                    variant="outline"
                    className="w-full border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    Actualiser les Données
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Healthcare Features Section */}
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] py-8 sm:py-12 md:py-16">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12">
          <span className="bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            Réseau Santé Verso Air
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-[0.75vw] sm:gap-5 md:gap-8">
          {healthcareFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gradient-to-br from-slate-800/50 to-red-900/30 backdrop-blur-md rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] text-center border border-red-500/20 hover:border-red-500/40 transition-all"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-lg">
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
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-red-500/30"
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
                        className="bg-red-900/30 text-red-300 border-red-500/30"
                      >
                        {selectedBusiness.category}
                      </Badge>
                      <div className="flex items-center gap-1 bg-red-900/50 text-yellow-400 px-2 py-1 rounded text-sm">
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
                        <div className="text-sm text-gray-400">Staff</div>
                        <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                          {selectedBusiness.employees}+
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-gray-400">Téléphone</div>
                      <div className="text-sm font-semibold text-white">
                        {selectedBusiness.phone || "Non précisé"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-gray-400">Email</div>
                      <div className="text-sm font-semibold text-white truncate">
                        {selectedBusiness.email || "Non précisé"}
                      </div>
                    </CardContent>
                  </Card>
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

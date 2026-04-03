import { useQuery } from "@tanstack/react-query";
import { searchBusinesses } from "@/lib/business-data";
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
  Calendar,
  TrendingUp,
  Users,
  Star,
  MapPin,
  BarChart3,
  Wrench,
  Hammer,
  Heart,
  Shield,
  Loader2,
  X,
  Building,
  Database,
  Activity,
  ExternalLink,
  DollarSign,
  HardHat,
  Briefcase,
  ChevronRight,
  ChevronDown,
  Check,
  Award,
  RefreshCw,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Pill,
  SquareActivity,
  Phone,
  Tag,
  Trash2,
  LogIn,
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
import { useRecordVisit } from "@/hooks/use-record-visit";
import { useAuthContext } from "@/contexts/AuthContext";

// Database API configuration - EXACT SAME AS HOSPITALITY
const API_BASE_URL = "";

// Database types - Construction & Building focused
interface BatimentFacility {
  id: string | number;
  title?: string;
  name?: string;
  description: string;
  category?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  rating?: number;
  reviews?: number;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  distance?: number;
  created_at?: string;
  revenue?: number;
  employees?: number;
  amenities?: string[];
  star_rating?: number;
  status?: "active" | "inactive" | "verified" | "premium";
  project_count?: number;
  workers_count?: number;
  specialization?: string[];
  equipment?: boolean;
  project_capacity?: number;
  certifications?: string[];
  insurance_coverage?: string[];
  [key: string]: any;
}

interface BatimentAnalytics {
  total_revenue: number;
  project_completion_rate: number;
  average_project_value: number;
  client_satisfaction: number;
  year_over_year_growth: number;
  top_categories: Array<{
    category: string;
    revenue: number;
    completion_rate: number;
    project_count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    revenue: number;
    projects: number;
    workers_deployed: number;
  }>;
  top_regions: Array<{
    region: string;
    revenue: number;
    percentage: number;
    contractor_count: number;
  }>;
  contractor_stats: Array<{
    type: string;
    count: number;
    growth: number;
    revenue: number;
  }>;
  project_types?: Array<{ type: string; percentage: number }>;
  specialties?: Array<{ specialty: string; count: number }>;
}

// Database API functions - Construction focused
async function fetchBatimentAnalytics(): Promise<BatimentAnalytics> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/batiment/analytics`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch batiment analytics:", error);
    return {
      total_revenue: 3250000,
      project_completion_rate: 85,
      average_project_value: 125000,
      client_satisfaction: 4.6,
      year_over_year_growth: 22.3,
      top_categories: [
        {
          category: "residential_construction",
          revenue: 1350000,
          completion_rate: 88,
          project_count: 145,
        },
        {
          category: "commercial_construction",
          revenue: 950000,
          completion_rate: 82,
          project_count: 78,
        },
        {
          category: "infrastructure",
          revenue: 625000,
          completion_rate: 81,
          project_count: 42,
        },
        {
          category: "renovation_remodeling",
          revenue: 185000,
          completion_rate: 90,
          project_count: 156,
        },
        {
          category: "industrial_construction",
          revenue: 140000,
          completion_rate: 79,
          project_count: 18,
        },
      ],
      monthly_trends: [
        { month: "Jan", revenue: 245000, projects: 18, workers_deployed: 850 },
        { month: "Feb", revenue: 268000, projects: 21, workers_deployed: 920 },
        { month: "Mar", revenue: 310000, projects: 25, workers_deployed: 1050 },
        { month: "Apr", revenue: 285000, projects: 22, workers_deployed: 980 },
        { month: "May", revenue: 335000, projects: 28, workers_deployed: 1120 },
      ],
      top_regions: [
        {
          region: "Abidjan",
          revenue: 925000,
          percentage: 28,
          contractor_count: 52,
        },
        {
          region: "Yamoussoukro",
          revenue: 680000,
          percentage: 21,
          contractor_count: 38,
        },
        {
          region: "Bouaké",
          revenue: 525000,
          percentage: 16,
          contractor_count: 31,
        },
        {
          region: "Daloa",
          revenue: 485000,
          percentage: 15,
          contractor_count: 28,
        },
        {
          region: "San Pedro",
          revenue: 635000,
          percentage: 19,
          contractor_count: 42,
        },
      ],
      contractor_stats: [
        {
          type: "Entrepreneurs généraux",
          count: 95,
          growth: 18.5,
          revenue: 1850000,
        },
        {
          type: "Entrepreneurs spécialisés",
          count: 162,
          growth: 12.3,
          revenue: 985000,
        },
        {
          type: "Location d'équipement",
          count: 58,
          growth: 25.7,
          revenue: 415000,
        },
      ],
    };
  }
}

// Search function for construction businesses
async function searchBatimentFacilities(params: {
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
  min_projects?: number;
  min_workers?: number;
  equipment?: string;
  countryCode?: string;
}): Promise<{ data: BatimentFacility[]; total: number; success: boolean }> {
  try {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append("query", params.query);
    if (params.category) queryParams.append("category", params.category);
    if (params.location) queryParams.append("location", params.location);
    if (params.min_rating)
      queryParams.append("min_rating", params.min_rating.toString());
    if (params.min_revenue)
      queryParams.append("min_revenue", params.min_revenue.toString());
    if (params.status) queryParams.append("status", params.status);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.min_projects)
      queryParams.append("min_projects", params.min_projects.toString());
    if (params.min_workers)
      queryParams.append("min_workers", params.min_workers.toString());
    if (params.specialization)
      queryParams.append("specialization", params.specialization);

    // Search within Construction sector pool (parent category ID 2 — Construction Companies, Civil Engineering)
    const results = (await searchBusinesses({
      query: params.query,
      sectorId: 2,
      location: params.location,
      countryCode: params.countryCode,
      limit: params.limit || 50,
    })) as any[];
    return {
      data: results.map((item: any) => ({
        id: item.id,
        title: item.name || item.title || "Entrepreneur sans nom",
        description: item.description || "Aucune description disponible",
        category: item.category,
        location: item.location || item.cityName || "Emplacement non précisé",
        address: item.address,
        phone: item.phone,
        email: item.email,
        rating: item.rating ? parseFloat(item.rating) : 0,
        reviews: item.reviews || 0,
        tags: item.tags,
        latitude: item.latitude,
        longitude: item.longitude,
        distance: item.distance,
        created_at: item.created_at,
        revenue: item.revenue,
        employees: item.employees,
        amenities: item.amenities,
        star_rating: item.star_rating,
        status: item.status,
        project_count: item.project_count,
        workers_count: item.workers_count,
        specialization: item.specialization,
        equipment: item.equipment,
        project_capacity: item.project_capacity,
        certifications: item.certifications,
        insurance_coverage: item.insurance_coverage,
      })) as BatimentFacility[],
      total: results.length,
      success: true,
    };
  } catch (error) {
    console.error("Search failed:", error);
    // Return empty data when API is unavailable
    return { data: [] as BatimentFacility[], total: 0, success: false };
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

// Filter options for construction
const categoryOptions = [
  { value: "residential", label: "Construction résidentielle" },
  { value: "commercial", label: "Construction commerciale" },
  { value: "infrastructure", label: "Projets d'infrastructure" },
  { value: "renovation", label: "Rénovation & Remodelage" },
  { value: "industrial", label: "Construction industrielle" },
  { value: "civil_works", label: "Travaux publics" },
  { value: "speciality", label: "Construction spécialisée" },
  { value: "landscaping", label: "Aménagement extérieur" },
];

const statusOptions = [
  { value: "active", label: "Actif" },
  { value: "verified", label: "Vérifié" },
  { value: "premium", label: "Premium" },
  { value: "accredited", label: "Accrédité" },
];

const specializationOptions = [
  { value: "structural", label: "Ingénierie structurelle" },
  { value: "hvac", label: "Systèmes CVC" },
  { value: "electrical", label: "Travaux électriques" },
  { value: "plumbing", label: "Plomberie & Eau" },
  { value: "foundation", label: "Travaux de fondation" },
  { value: "concrete", label: "Béton & Maçonnerie" },
  { value: "roofing", label: "Toiture" },
  { value: "finishing", label: "Finition intérieure" },
];

const sortOptions = [
  { value: "rating_desc", label: "Meilleure note" },
  { value: "revenue_desc", label: "Chiffre d'affaires" },
  { value: "beds_desc", label: "Plus de projets" },
  { value: "doctors_desc", label: "Plus d'employés" },
  { value: "name_asc", label: "Nom A-Z" },
  { value: "location_asc", label: "Localisation" },
];

type TabType =
  | "analytics"
  | "facilities"
  | "patients"
  | "resources"
  | "database"
  | "history";

export default function BatimentDashboard() {
  // Chart refs - SAME AS HOSPITALITY
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstanceRef = useRef<any>(null);

  // State variables - SAME STRUCTURE
  const [activeTab, setActiveTab] = useState<TabType>("facilities");

  // ── Browsing history (authenticated users only) ───────────────────────────
  const { user, token } = useAuthContext();
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const t =
        token ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("authToken");
      const res = await fetch("/api/user/history", {
        credentials: "include",
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch {
      /* silent */
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteHistoryEntry = async (id: number | "all") => {
    const t =
      token ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("authToken");
    await fetch(`/api/user/history/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (id === "all") setHistory([]);
    else setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  const [showFilters, setShowFilters] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const { selectedCountry } = useCountry();
  const [searchResults, setSearchResults] = useState<BatimentFacility[]>([]);
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
    specialization: "",
    minDoctors: "",
    minBeds: "",
    sort_by: "rating_desc",
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] =
    useState<BatimentFacility | null>(null);
  const [showFacilityDetails, setShowFacilityDetails] = useState(false);
  useScrollLock(showFacilityDetails);

  // Database connection test - SAME AS HOSPITALITY
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testDatabaseConnection();
      // Mark as connected if success is true
      const connected = result.success === true;
      setDatabaseConnected(connected);
    };
    checkConnection();
  }, []);

  // Fetch construction analytics
  const { data: analytics } = useQuery({
    queryKey: ["batiment-analytics"],
    queryFn: fetchBatimentAnalytics,
    refetchInterval: autoRefresh ? 300000 : false,
    staleTime: 60000,
    enabled: databaseConnected === true,
  });

  // Fetch initial construction contractors
  const fetchFacilities = useCallback(async () => {
    if (databaseConnected === false) {
      // Use fallback data immediately
      const result = await searchBatimentFacilities({
        category: "construction",
        countryCode: selectedCountry || undefined,
        limit: 9,
        sort_by: activeFilters.sort_by,
      });
      setSearchResults(result.data);
      setTotalResults(result.total);
      setHasSearched(true);
      setIsInitialLoading(false);
      return;
    }

    setIsInitialLoading(true);
    const result = await searchBatimentFacilities({
      category: "construction",
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
    fetchFacilities();
  }, [fetchFacilities]);

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

  // Search handler - Construction projects
  const handleSearch = async (page: number = 1) => {
    setIsSearching(true);
    setCurrentPage(page);
    const params: any = {
      query: searchQuery,
      category: "construction",
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

    const result = await searchBatimentFacilities(params);
    if (result.success) {
      setSearchResults(result.data);
      setTotalResults(result.total);
      setHasSearched(true);
    }
    setIsSearching(false);
  };

  // Clear all filters - SAME FUNCTION
  const clearAllFilters = () => {
    setActiveFilters({
      category: "",
      minRating: "",
      minRevenue: "",
      status: "",
      amenities: "",
      specialization: "",
      minDoctors: "",
      minBeds: "",
      sort_by: "rating_desc",
    });
    setSearchQuery("");
    setLocationQuery("");
    fetchFacilities();
  };

  // Carousel state with images - SAME SYSTEM
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
      name: "Chargement des entreprises de construction...",
      desc: "Connexion à la base de données",
      image:
        "https://images.unsplash.com/photo-1516549655669-df765b18280f?w=800",
      type: "Bâtiment",
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Update carousel with database results - SAME LOGIC
  useEffect(() => {
    if (searchResults.length > 0) {
      const featuredEnterprises = searchResults.slice(0, 8).map((facility) => ({
        name: facility.title || "Entrepreneur BTP",
        desc:
          facility.description ||
          "Services professionnels de construction et bâtiment",
        image: `https://images.unsplash.com/photo-${Math.floor(
          Math.random() * 1000,
        )}?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80`,
        rating: facility.rating,
        location: facility.location,
        type: facility.category,
      }));
      setEnterprises(
        featuredEnterprises.length > 0 ? featuredEnterprises : enterprises,
      );
    }
  }, [searchResults]);

  // Carousel auto-slide - SAME INTERVAL
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % enterprises.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [enterprises.length]);

  // Initialize charts - Construction sector data
  useEffect(() => {
    if (chartRef.current && window.Chart && analytics?.monthly_trends) {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();

      const ctx = chartRef.current.getContext("2d");
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "hsla(210, 100%, 60%, 0.4)");
        gradient.addColorStop(1, "hsla(210, 100%, 60%, 0.05)");

        const labels = analytics.monthly_trends.map((t) => t.month);
        const revenueData = analytics.monthly_trends.map((t) => t.revenue || 0);
        const workersData = analytics.monthly_trends.map(
          (t) => t.workers_deployed || 0,
        );

        chartInstanceRef.current = new window.Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Revenus (€)",
                data: revenueData,
                borderColor: "hsl(210, 100%, 60%)",
                backgroundColor: gradient,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: "hsl(210, 100%, 60%)",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
              },
              {
                label: "Ouvriers déployés",
                data: workersData,
                borderColor: "hsl(160, 100%, 40%)",
                backgroundColor: "hsla(160, 100%, 40%, 0.1)",
                tension: 0.4,
                fill: false,
                pointBackgroundColor: "hsl(160, 100%, 40%)",
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
                      : `${context.raw.toLocaleString()} ouvriers`;
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

  // Initialize bar chart - SAME CONFIG
  useEffect(() => {
    if (barChartRef.current && window.Chart && analytics?.top_categories) {
      if (barChartInstanceRef.current) barChartInstanceRef.current.destroy();

      const ctx = barChartRef.current.getContext("2d");
      if (ctx) {
        const labels = analytics.top_categories.map((c) =>
          c.category
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
        );
        const data = analytics.top_categories.map((c) => c.revenue || 0);

        barChartInstanceRef.current = new window.Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Revenus par type (€)",
                data,
                backgroundColor: [
                  "hsla(210, 100%, 60%, 0.8)",
                  "hsla(210, 100%, 60%, 0.6)",
                  "hsla(210, 100%, 60%, 0.5)",
                  "hsla(210, 100%, 60%, 0.4)",
                  "hsla(210, 100%, 60%, 0.3)",
                ],
                borderColor: "hsl(210, 100%, 60%)",
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
              x: {
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: {
                  maxRotation: 45,
                  minRotation: 45,
                },
              },
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

  // Handle facility selection - SAME FUNCTION
  const recordVisit = useRecordVisit();
  const handleFacilitySelect = (facility: BatimentFacility) => {
    setSelectedFacility(facility);
    setShowFacilityDetails(true);
    recordVisit({
      businessId:
        typeof facility.id === "string"
          ? parseInt(facility.id, 10) || 0
          : facility.id,
      businessName: facility.title ?? facility.name,
      sector: "batiment",
      pageUrl: window.location.pathname,
      metadata: { category: facility.category, location: facility.location },
    });
  };

  // Construction features
  const batimentFeatures = [
    {
      icon: <Building className="h-8 w-8" />,
      title: "Base de données Bâtiment",
      description:
        "Base de données complète d'entrepreneurs et d'entreprises de construction",
    },
    {
      icon: <Briefcase className="h-8 w-8" />,
      title: "Répertoire de projets",
      description: "Trouvez des entrepreneurs par spécialisation et expertise",
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Certifications",
      description: "Entrepreneurs agréés, cautionnés et assurés",
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Suivi de performance",
      description: "Taux d'achèvement des projets et satisfaction client",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Analytique main-d'œuvre",
      description:
        "Indicateurs de déploiement de la main-d'œuvre en temps réel",
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "Base de données PostgreSQL",
      description:
        "Enregistrements de construction en direct depuis la base Verso Air",
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

      {/* Hero + Carousel Container - SAME LAYOUT */}
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

        <div className="relative z-10 w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20">
              �️ Intelligence Bâtiment & Construction
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-2xl"
          >
            Base de données Bâtiment & Construction
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-[clamp(1rem,1.4vw,1.25rem)] mb-4 text-white/90"
          >
            Base de données PostgreSQL en temps réel avec{" "}
            {totalResults.toLocaleString()}+ chantiers, entrepreneurs & projets
            de construction
          </motion.p>

          {/* Database Stats - SAME COMPONENTS */}
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
                  <span className="text-sm text-blue-200">Base en direct</span>
                </div>
                <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                  {totalResults.toLocaleString()}+ Entrées
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-md border-teal-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-[0.5vw]">
                  <Building className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-teal-400" />
                  <span className="text-sm text-teal-200">
                    Entreprises bâtiment
                  </span>
                </div>
                <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                  {searchResults.length} Chargées
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-md border-blue-500/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-[0.5vw]">
                  <Wrench className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] text-blue-400" />
                  <span className="text-sm text-blue-200">Ouvriers actifs</span>
                </div>
                <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                  {searchResults
                    .reduce((acc, f) => acc + (f.workers_count || 0), 0)
                    .toLocaleString()}
                  +
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Auto-sliding enterprises - SAME SYSTEM */}
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
                          Math.floor(enterprises[currentIndex]?.rating || 5),
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
                    <div className="flex items-center gap-[0.5vw] mt-3 text-blue-200">
                      <MapPin className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)]" />
                      <span>
                        {enterprises[currentIndex]?.location ||
                          "Emplacement non précisé"}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-blue-400" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter Section - SAME LAYOUT */}
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
                  placeholder="Rechercher entreprises de construction, architectes..."
                  className="pl-12 bg-slate-800/50 border-blue-600 text-white placeholder-blue-300/60"
                />
              </div>
              <div className="relative flex-1 w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                <Input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Ville, région ou zone de construction..."
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
                      className="w-full sm:w-[180px] bg-slate-700 border-blue-600 justify-between"
                    >
                      <span className="text-sm">
                        {sortOptions.find(
                          (o) => o.value === activeFilters.sort_by,
                        )?.label || "Trier par"}
                      </span>
                      <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-blue-600 w-[200px]">
                    {sortOptions.map((option) => (
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
                          <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                        )}
                        <span
                          className={
                            activeFilters.sort_by === option.value
                              ? "font-semibold text-blue-300"
                              : "text-blue-200"
                          }
                        >
                          {option.label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="text-sm text-blue-300">
                  {totalResults.toLocaleString()} résultats
                </div>
              </div>
            </div>

            {/* Advanced Filters - SAME STRUCTURE */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-visible"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[0.75vw] sm:gap-[1vw] p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-blue-700">
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
                      Type de bâtiment
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-slate-700 border-blue-600 justify-between"
                        >
                          <span className="text-sm">
                            {categoryOptions.find(
                              (c) => c.value === activeFilters.category,
                            )?.label || "Tous les types"}
                          </span>
                          <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="bg-slate-800 border-blue-600 w-[200px]"
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
                              <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                            )}
                            <span
                              className={
                                activeFilters.category === cat.value
                                  ? "font-semibold text-blue-300"
                                  : "text-blue-200"
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
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
                      Spécialisation
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full bg-slate-700 border-blue-600 justify-between"
                        >
                          <span className="text-sm">
                            {specializationOptions.find(
                              (s) => s.value === activeFilters.specialization,
                            )?.label || "Toutes les spécialisations"}
                          </span>
                          <ChevronDown className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="bg-slate-800 border-blue-600 w-[200px]"
                        side="bottom"
                        align="start"
                        sideOffset={8}
                      >
                        {specializationOptions.map((spec) => (
                          <DropdownMenuItem
                            key={spec.value}
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveFilters({
                                ...activeFilters,
                                specialization: spec.value,
                              });
                            }}
                          >
                            {activeFilters.specialization === spec.value && (
                              <Check className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                            )}
                            <span
                              className={
                                activeFilters.specialization === spec.value
                                  ? "font-semibold text-blue-300"
                                  : "text-blue-200"
                              }
                            >
                              {spec.label}
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
                      Min. employés
                    </Label>
                    <Input
                      type="number"
                      value={activeFilters.minDoctors}
                      onChange={(e) =>
                        setActiveFilters({
                          ...activeFilters,
                          minDoctors: e.target.value,
                        })
                      }
                      placeholder="Any"
                      className="bg-slate-700 border-blue-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
                      Min. projets
                    </Label>
                    <Input
                      type="number"
                      value={activeFilters.minBeds}
                      onChange={(e) =>
                        setActiveFilters({
                          ...activeFilters,
                          minBeds: e.target.value,
                        })
                      }
                      placeholder="Any"
                      className="bg-slate-700 border-blue-600"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
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
                      <DropdownMenuContent
                        className="bg-slate-800 border-blue-600 w-[200px]"
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

                  <div>
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
                      Équipements
                    </Label>
                    <Input
                      type="text"
                      value={activeFilters.amenities}
                      onChange={(e) =>
                        setActiveFilters({
                          ...activeFilters,
                          amenities: e.target.value,
                        })
                      }
                      placeholder="Gestion de site, Équipement lourd..."
                      className="bg-slate-700 border-blue-600"
                    />
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

      {/* Main Content with Tabs - SAME STRUCTURE */}
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] py-[2vh] sm:py-[3vh] md:py-[4vh]">
        {/* Tabs Navigation */}
        <div className="relative mb-[1.5vw] overflow-x-auto scrollbar-hide bg-slate-800/50 rounded-xl p-[0.4vw] border border-blue-500/20 backdrop-blur-sm">
          <div className="flex w-fit mx-auto">
            {(
              [
                "analytics",
                "facilities",
                "patients",
                "resources",
                "database",
                "history",
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
                className={`relative whitespace-nowrap px-[1vw] py-[0.5vw] rounded-lg text-[clamp(0.65rem,1vw,0.875rem)] font-medium transition-colors duration-200 shrink-0 flex items-center ${
                  activeTab === tab
                    ? "text-white"
                    : "text-blue-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="batiment-active-tab"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-lg shadow-blue-500/25"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center">
                  {tab === "facilities" && (
                    <HardHat className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                  )}
                  {tab === "analytics" && (
                    <BarChart3 className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                  )}
                  {tab === "patients" && (
                    <Users className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                  )}
                  {tab === "resources" && (
                    <Activity className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                  )}
                  {tab === "database" && (
                    <Database className="h-[clamp(1rem,1.2vw,1.25rem)] w-[clamp(1rem,1.2vw,1.25rem)] mr-2" />
                  )}
                  {(
                    {
                      analytics: "Analytique",
                      facilities: "Entreprises",
                      patients: "Projets",
                      resources: "Ressources",
                      database: "Base de données",
                      history: "Historique",
                    } as Record<string, string>
                  )[tab] || tab}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {activeTab === "facilities" && (
          <>
            {/* Live Search Results Section - SAME LAYOUT */}
            {hasSearched && (
              <div>
                <div className="flex items-center justify-between mb-[1vw]">
                  <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold flex items-center gap-[0.5vw]">
                    <Database className="h-6 w-6 text-blue-400" />
                    <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                      Résultats base de données ({searchResults.length} sur{" "}
                      {totalResults.toLocaleString()})
                    </span>
                  </h2>
                  <div className="text-sm text-blue-300">
                    {databaseConnected
                      ? "✅ Données PostgreSQL en direct"
                      : "✅ Données réelles"}
                  </div>
                </div>

                {/* Loading State - SAME COMPONENT */}
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
                              Chargement des entreprises de construction...
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
                              Récupération des entreprises de construction...
                            </p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((facility, index) => (
                            <SectorBusinessCard
                              key={facility.id}
                              business={facility}
                              index={index}
                              theme="blue"
                              onSelect={handleFacilitySelect}
                              sectorIcon={Hammer}
                              sectorLabel={(b) =>
                                `${(b as any).project_count || 0} Projets`
                              }
                            />
                          ))
                        ) : (
                          <div className="col-span-full text-center py-[2vh] sm:py-[3vh] md:py-[4vh]">
                            <Search className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold text-gray-300 mb-2">
                              Aucune entreprise trouvée
                            </h3>
                            <p className="text-gray-400">
                              Essayez une autre recherche ou effacez les filtres
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

                    {/* Pagination - SAME COMPONENT */}
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
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-[1vw] flex items-center gap-[0.5vw]">
              <BarChart3 className="h-6 w-6" />
              Analytique bâtiment
            </h2>

            {/* Summary Cards - SAME COMPONENTS */}
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
                    : "€2.85M"
                }
                change={
                  analytics
                    ? `+${analytics.year_over_year_growth || 0}% YoY`
                    : "+18.5% YoY"
                }
                trend="up"
                color="blue"
                icon={<DollarSign className="h-5 w-5" />}
              />
              <AnalyticsCard
                title="Taux d'achèvement des projets"
                value={
                  analytics ? `${analytics.project_completion_rate}%` : "85%"
                }
                change={
                  analytics
                    ? `+${Math.round((analytics.project_completion_rate || 0) / 10)}%`
                    : "+8% par rapport au mois dernier"
                }
                trend="up"
                color="teal"
                icon={<CheckCircle className="h-5 w-5" />}
              />
              <AnalyticsCard
                title="Satisfaction client"
                value={
                  analytics ? `${analytics.client_satisfaction}/5` : "4.6/5"
                }
                change={
                  analytics
                    ? `+${Math.round(
                        (analytics.client_satisfaction || 0) * 2,
                      )}%`
                    : "+5% par rapport au mois dernier"
                }
                trend="up"
                color="green"
                icon={<Star className="h-5 w-5" />}
              />
              <AnalyticsCard
                title="Valeur moyenne projet"
                value={
                  analytics
                    ? `€${Math.round((analytics.average_project_value || 0) / 1000)}K`
                    : "€125K"
                }
                change={
                  analytics
                    ? `+${Math.round(
                        (analytics.average_project_value || 0) / 10000,
                      )}%`
                    : "+12% par rapport au mois dernier"
                }
                trend="up"
                color="indigo"
                icon={<DollarSign className="h-5 w-5" />}
              />
            </motion.div>

            {/* Charts and Details - SAME LAYOUT */}
            <div className="grid lg:grid-cols-2 gap-[1vw] mb-[1.5vw]">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-blue-500/20">
                <CardContent>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[clamp(1rem,1.4vw,1.25rem)] font-semibold text-white">
                      Tendances revenus & projets
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

            {/* Additional Metrics - SAME STRUCTURE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1.5vw]">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] shadow-lg border border-blue-500/20">
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
                            {category.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm text-green-400">
                            {category.project_count?.toLocaleString() || "0"}{" "}
                            projets
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
                            category: "Construction générale",
                            revenue: 1254000,
                            patient_count: 12500,
                          },
                          {
                            category: "Services électriques",
                            revenue: 892000,
                            patient_count: 8900,
                          },
                          {
                            category: "Plomberie",
                            revenue: 568000,
                            patient_count: 6500,
                          },
                          {
                            category: "Architecture",
                            revenue: 423000,
                            patient_count: 5200,
                          },
                          {
                            category: "Toiture",
                            revenue: 287000,
                            patient_count: 3400,
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
                                {item.patient_count.toLocaleString()} projets
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
                          {region.percentage || 0}% •{" "}
                          {region.contractor_count || 0} entrepreneurs
                        </div>
                      </div>
                    )) || (
                      <>
                        {[
                          {
                            region: "Abidjan",
                            revenue: 850000,
                            percentage: 30,
                            facility_count: 45,
                          },
                          {
                            region: "Yamoussoukro",
                            revenue: 625000,
                            percentage: 22,
                            facility_count: 32,
                          },
                          {
                            region: "Bouaké",
                            revenue: 485000,
                            percentage: 17,
                            facility_count: 28,
                          },
                          {
                            region: "Daloa",
                            revenue: 425000,
                            percentage: 15,
                            facility_count: 25,
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
                              {region.percentage}% • {region.facility_count}{" "}
                              entreprises
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
                        metric: "Valeur moyenne projet",
                        value: analytics
                          ? `€${Math.round(
                              (analytics.average_project_value || 0) / 1000,
                            )}K`
                          : "€125K",
                        change: "+8%",
                      },
                      {
                        metric: "Satisfaction client",
                        value: analytics
                          ? `${Math.round(
                              (analytics.client_satisfaction || 0) * 20,
                            )}%`
                          : "92%",
                        change: "+5%",
                      },
                      {
                        metric: "Ratio ouvriers/projet",
                        value: "1:8",
                        change: "Stable",
                      },
                      {
                        metric: "Durée moyenne d'achèvement",
                        value: "12 semaines",
                        change: "-15%",
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
                                : item.change.startsWith("-")
                                  ? "text-red-400"
                                  : "text-blue-400"
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

        {activeTab === "patients" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-[1vw] flex items-center gap-[0.5vw]">
              <Users className="h-6 w-6" />
              Analytique projets
            </h2>
            <p className="text-gray-300 mb-6">
              Statistiques de projets et indicateurs de performance du secteur
              bâtiment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
              {[
                {
                  title: "Total projets",
                  value: "28,500",
                  change: "+12%",
                  icon: <Users className="h-5 w-5" />,
                },
                {
                  title: "Projets actifs",
                  value: "3,850",
                  change: "+8%",
                  icon: <Wrench className="h-5 w-5" />,
                },
                {
                  title: "Délai moyen",
                  value: "18 min",
                  change: "-15%",
                  icon: <Clock className="h-5 w-5" />,
                },
                {
                  title: "Taux de reprise",
                  value: "7.8%",
                  change: "-3%",
                  icon: <RefreshCw className="h-5 w-5" />,
                },
                {
                  title: "Satisfaction client",
                  value: "94%",
                  change: "+5%",
                  icon: <Heart className="h-5 w-5" />,
                },
                {
                  title: "Couverture assurance",
                  value: "82%",
                  change: "+4%",
                  icon: <Shield className="h-5 w-5" />,
                },
              ].map((metric, index) => (
                <Card
                  key={index}
                  className="bg-white/5 border-white/10 hover:border-blue-500/30 transition-colors"
                >
                  <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 bg-blue-600/20 rounded-lg`}>
                        <div className={`text-blue-400`}>{metric.icon}</div>
                      </div>
                      <div
                        className={`text-sm ${
                          metric.change.startsWith("+")
                            ? "text-green-400"
                            : metric.change.startsWith("-")
                              ? "text-red-400"
                              : "text-blue-400"
                        }`}
                      >
                        {metric.change}
                      </div>
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {metric.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-blue-300">
                      {metric.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "resources" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold mb-[1vw] flex items-center gap-[0.5vw]">
              <Activity className="h-6 w-6" />
              Ressources & Équipements
            </h2>
            <p className="text-gray-300 mb-6">
              Gestion des équipements, du personnel et des ressources.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1vw]">
              {[
                {
                  title: "Ouvriers actifs",
                  value: "1,450",
                  status: "Disponible",
                  icon: <Wrench className="h-5 w-5" />,
                },
                {
                  title: "Équipements disponibles",
                  value: "4,250",
                  status: "Suffisant",
                  icon: <Hammer className="h-5 w-5" />,
                },
                {
                  title: "Stock matériaux",
                  value: "95%",
                  status: "Bon",
                  icon: <Pill className="h-5 w-5" />,
                },
                {
                  title: "État des machines",
                  value: "92%",
                  status: "Opérationnel",
                  icon: <SquareActivity className="h-5 w-5" />,
                },
                {
                  title: "Satisfaction du personnel",
                  value: "88%",
                  status: "Bon",
                  icon: <UserCheck className="h-5 w-5" />,
                },
                {
                  title: "Prêt d'urgence",
                  value: "98%",
                  status: "Excellent",
                  icon: <AlertCircle className="h-5 w-5" />,
                },
              ].map((resource, index) => (
                <Card
                  key={index}
                  className="bg-white/5 border-white/10 hover:border-blue-500/30 transition-colors"
                >
                  <CardContent className="p-[clamp(0.75rem,2vw,2.5rem)]">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 bg-blue-600/20 rounded-lg`}>
                        <div className={`text-blue-400`}>{resource.icon}</div>
                      </div>
                      <div
                        className={`text-sm ${
                          resource.status === "Excellent"
                            ? "text-green-400"
                            : resource.status === "Bon"
                              ? "text-blue-400"
                              : "text-yellow-400"
                        }`}
                      >
                        {resource.status}
                      </div>
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                      {resource.title}
                    </h3>
                    <div className="text-base sm:text-lg md:text-2xl font-bold text-blue-300">
                      {resource.value}
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
                      Total enregistrements bâtiment
                    </span>
                    <span className="font-semibold text-white">
                      {totalResults.toLocaleString()}+
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">
                      Entreprises bâtiment actives
                    </span>
                    <span className="font-semibold text-white">
                      {searchResults.length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">
                      Total projets réalisés
                    </span>
                    <span className="font-semibold text-white">
                      {searchResults
                        .reduce((acc, f) => acc + (f.project_count || 0), 0)
                        .toLocaleString()}
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
                      window.open(`${API_BASE_URL}/api/health`, "_blank")
                    }
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                  >
                    Tester la connexion
                  </Button>
                  <Button
                    onClick={() => handleSearch(1)}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    Actualiser les données
                  </Button>
                  <Button
                    onClick={() => fetchFacilities()}
                    variant="outline"
                    className="w-full border-teal-500 text-teal-400 hover:bg-teal-500/10"
                  >
                    Charger plus de résultats
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Browsing History Tab ───────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-[clamp(1rem,2vw,2rem)] border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[clamp(1.125rem,1.6vw,1.5rem)] font-bold text-blue-300 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historique de navigation
              </h2>
              {user && history.length > 0 && (
                <button
                  onClick={() => deleteHistoryEntry("all")}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Tout effacer
                </button>
              )}
            </div>

            {/* Not logged in */}
            {!user && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <LogIn className="h-12 w-12 text-blue-400/60" />
                <p className="text-blue-200 text-sm max-w-xs">
                  Connectez-vous pour suivre les entrepreneurs et projets
                  consultés. Votre historique se synchronise sur tous vos
                  appareils.
                </p>
                <a
                  href="/auth/signin"
                  className="mt-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white text-sm font-medium rounded-lg transition-all"
                >
                  Se connecter
                </a>
              </div>
            )}

            {/* Loading */}
            {user && historyLoading && (
              <div className="flex items-center justify-center py-16 gap-3 text-blue-300">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Chargement de l'historique…</span>
              </div>
            )}

            {/* Empty */}
            {user && !historyLoading && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Clock className="h-10 w-10 text-blue-400/40" />
                <p className="text-blue-200/60 text-sm">
                  Aucun historique. Cliquez sur une fiche entrepreneur pour
                  commencer.
                </p>
              </div>
            )}

            {/* History list */}
            {user && !historyLoading && history.length > 0 && (
              <div className="space-y-2">
                {history.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-3 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                        <HardHat className="h-4 w-4 text-blue-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {entry.businessName ?? "Entreprise inconnue"}
                        </p>
                        <p className="text-blue-300/70 text-xs flex items-center gap-1.5">
                          <span className="capitalize px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] font-medium">
                            {entry.sector}
                          </span>
                          <span>
                            {new Date(entry.visitedAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}{" "}
                            ·{" "}
                            {new Date(entry.visitedAt).toLocaleTimeString(
                              undefined,
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteHistoryEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/70 hover:text-red-400 p-1.5 rounded"
                      title="Supprimer l'entrée"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Construction Features Section - SAME LAYOUT */}
      <div className="w-[96vw] sm:w-[96vw] md:w-[97vw] lg:w-[98vw] mx-auto px-[2vw] py-8 sm:py-12 md:py-16">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12">
          <span className="bg-gradient-to-r from-blue-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">
            Plateforme d'intelligence Bâtiment
          </span>
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-[0.75vw] sm:gap-5 md:gap-8">
          {batimentFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-gradient-to-br from-slate-800/50 to-blue-900/30 backdrop-blur-md rounded-xl p-[clamp(0.75rem,2vw,2.5rem)] text-center border border-blue-500/20 hover:border-blue-500/40 transition-all hover:shadow-lg"
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

      {/* Facility Details Modal - SAME STRUCTURE */}
      <AnimatePresence>
        {showFacilityDetails && selectedFacility && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFacilityDetails(false)}
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
                  {selectedFacility.title}
                </h2>
                <button
                  onClick={() => setShowFacilityDetails(false)}
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
                        {selectedFacility.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-[0.5vw]">
                      <Badge
                        variant="outline"
                        className="bg-blue-900/30 text-blue-300 border-blue-500/30 capitalize"
                      >
                        {(selectedFacility.category ?? "unknown").replace(
                          /_/g,
                          " ",
                        )}
                      </Badge>
                      <div className="flex items-center gap-1 bg-blue-900/50 text-yellow-400 px-2 py-1 rounded text-sm">
                        <Star className="h-[clamp(0.75rem,1vw,1rem)] w-[clamp(0.75rem,1vw,1rem)] fill-current" />
                        <span className="font-bold">
                          {selectedFacility.rating?.toFixed(1) || "4.5"}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">
                          ({selectedFacility.reviews || 0} avis)
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
                    {selectedFacility.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[0.75vw] sm:gap-[1vw]">
                  {selectedFacility.revenue && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">
                          Chiffre d'affaires annuel
                        </div>
                        <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                          €{selectedFacility.revenue.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedFacility.project_count && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">
                          Projets réalisés
                        </div>
                        <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                          {selectedFacility.project_count}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedFacility.workers_count && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">Employés</div>
                        <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-white">
                          {selectedFacility.workers_count}+
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedFacility.equipment && (
                    <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">
                          Équipement disponible
                        </div>
                        <div className="text-[clamp(1rem,1.4vw,1.25rem)] font-bold text-green-400">
                          Oui
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-gray-400">Contact</div>
                      <div className="text-sm font-semibold text-white">
                        {selectedFacility.phone || "Non précisé"}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 rounded-lg p-3 sm:p-4">
                    <CardContent className="p-0">
                      <div className="text-sm text-gray-400">E-mail</div>
                      <div className="text-sm font-semibold text-white truncate">
                        {selectedFacility.email || "Non précisé"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedFacility.specialization &&
                  selectedFacility.specialization.length > 0 && (
                    <div>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2">
                        Spécialisations
                      </h3>
                      <div className="flex flex-wrap gap-[0.5vw]">
                        {selectedFacility.specialization.map((spec, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-blue-900/30 text-blue-300 border-blue-500/30"
                          >
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedFacility.amenities &&
                  selectedFacility.amenities.length > 0 && (
                    <div>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2">
                        Services & Équipements
                      </h3>
                      <div className="flex flex-wrap gap-[0.5vw]">
                        {selectedFacility.amenities.map((amenity, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-slate-800/50 text-gray-300 border-slate-600"
                          >
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex gap-[1vw] pt-6 border-t border-slate-700">
                  <Button className="flex-1 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700">
                    Contacter l'entreprise
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600 hover:bg-slate-800"
                    onClick={() => setShowFacilityDetails(false)}
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

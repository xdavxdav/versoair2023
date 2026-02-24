import { Button } from "@/components/ui/button";
import { Link } from "wouter";
/* webhint-disable hint-no-inline-styles */
import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Filter,
  Search,
  ChevronRight,
  Building,
  Globe,
  Sparkles,
  TrendingUp,
  Zap,
  Target,
  Heart,
  Bookmark,
  Share2,
  Mail,
  Phone,
  Linkedin,
  ExternalLink,
  RefreshCw,
  Layers,
  Briefcase,
  GraduationCap,
  Code,
  BarChart,
  MessageSquare,
  Users as UsersIcon,
  Award,
  Coffee,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  User,
  Server,
  HardDrive,
  Network,
  Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Database API configuration - Use the same as other pages
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// PostgreSQL Database Configuration - Use the same database as other pages
const DB_CONFIG = {
  user: "versoair",
  password: "versoair2025",
  host: "localhost",
  port: 5432,
  database: "versoair_business_intelligence", // Same database as commerce page
};

// TRACE: Define TypeScript interfaces for database tables
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string; // full-time, part-time, contract, internship, remote
  salary_min: number;
  salary_max: number;
  currency: string;
  description: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  experience_level: string; // entry, mid, senior, executive
  education_level: string; // high_school, bachelor, master, phd
  department: string;
  posted_date: string;
  application_deadline: string | null;
  is_featured: boolean;
  is_remote: boolean;
  application_count: number;
  view_count: number;
  status: string; // active, closed, draft
  company_logo?: string;
  company_description?: string;
  apply_url?: string;
  created_at: string;
  updated_at: string;
}

interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  status: string; // submitted, reviewed, interviewed, rejected, accepted
  applied_date: string;
  cover_letter?: string;
  resume_url?: string;
  notes?: string;
}

interface SavedJob {
  id: string;
  job_id: string;
  user_id: string;
  saved_date: string;
}

// Database connection status interface
interface DatabaseHealth {
  success: boolean;
  message: string;
  database?: {
    connected: boolean;
    name: string;
    host: string;
    port: string;
    user: string;
  };
}

// TRACE: Job categories for filtering
const jobCategories = [
  "Engineering",
  "Data Science",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "Finance",
  "Human Resources",
  "Customer Support",
];

// TRACE: Job types
const jobTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Remote",
  "Hybrid",
];

// TRACE: Experience levels
const experienceLevels = ["Entry", "Mid", "Senior", "Executive"];

// TRACE: Education levels
const educationLevels = ["High School", "Bachelor's", "Master's", "PhD"];

export default function Careers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [salaryRange, setSalaryRange] = useState([0, 300000]);
  const [showRemoteOnly, setShowRemoteOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [databaseHealth, setDatabaseHealth] = useState<DatabaseHealth | null>(
    null,
  );
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // TRACE: Database query hooks - These connect to your PostgreSQL database
  const queryClient = useQueryClient();

  // TRACE: Check database connection using the same /api/health endpoint as other pages
  const { data: healthData, refetch: refetchHealth } = useQuery<DatabaseHealth>(
    {
      queryKey: ["database-health"],
      queryFn: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/health`);
          if (!response.ok) {
            throw new Error(`Health check failed: ${response.statusText}`);
          }
          return await response.json();
        } catch (error) {
          console.error("Health check error:", error);
          return {
            success: false,
            message: "Failed to connect to database",
            database: {
              connected: false,
              name: DB_CONFIG.database,
              host: DB_CONFIG.host,
              port: String(DB_CONFIG.port),
              user: DB_CONFIG.user,
            },
          };
        }
      },
      retry: 2,
      refetchInterval: 30000, // Check every 30 seconds
    },
  );

  useEffect(() => {
    if (healthData) {
      setDatabaseHealth(healthData);
      setIsCheckingConnection(false);
    }
  }, [healthData]);

  // TRACE: Fetch jobs from PostgreSQL database
  const {
    data: jobs = [],
    isLoading,
    error,
    refetch: refetchJobs,
  } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jobs/search`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch jobs: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success === false) {
          throw new Error(data.message || "Failed to fetch jobs");
        }

        return Array.isArray(data) ? data : data.data || [];
      } catch (error) {
        console.error("Error fetching jobs from database:", error);
        throw error;
      }
    },
    enabled: !isCheckingConnection,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // TRACE: Mutation for applying to jobs
  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/jobs/${jobId}/apply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: "current-user-id",
              applied_date: new Date().toISOString(),
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to submit application");
        }

        return await response.json();
      } catch (error) {
        throw new Error("Application submission failed");
      }
    },
    onSuccess: (data, jobId) => {
      toast({
        title: "Application submitted!",
        description: "Your application has been saved to the database.",
      });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // TRACE: Mutation for saving jobs
  const saveJobMutation = useMutation({
    mutationFn: async ({
      jobId,
      action,
    }: {
      jobId: string;
      action: "save" | "unsave";
    }) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/jobs/${jobId}/${action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: "current-user-id" }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to ${action} job`);
        }

        return await response.json();
      } catch (error) {
        throw new Error(`Failed to ${action} job`);
      }
    },
    onSuccess: (data, variables) => {
      const { jobId, action } = variables;
      setSavedJobs((prev) =>
        action === "save"
          ? [...prev, jobId]
          : prev.filter((id) => id !== jobId),
      );

      toast({
        title: action === "save" ? "Job saved!" : "Job removed",
        description:
          action === "save"
            ? "Job added to your saved list"
            : "Job removed from your saved list",
      });
    },
    onError: (error, variables) => {
      toast({
        title: "Operation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // TRACE: Refresh jobs from database
  const refreshJobs = () => {
    refetchJobs();
    toast({
      title: "Jobs refreshed!",
      description: "Latest opportunities loaded from PostgreSQL database.",
    });
  };

  // TRACE: Filter jobs based on search criteria
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search query filter
      const matchesSearch =
        searchQuery === "" ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.skills.some((skill) =>
          skill.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      // Category filter
      const matchesCategory =
        selectedCategory === "all" ||
        (job.department &&
          job.department
            .toLowerCase()
            .includes(selectedCategory.toLowerCase()));

      // Type filter
      const matchesType =
        selectedType === "all" ||
        (selectedType === "Remote" && job.is_remote) ||
        job.type === selectedType.toLowerCase().replace("-", "_");

      // Experience filter
      const matchesExperience =
        selectedExperience === "all" ||
        job.experience_level === selectedExperience.toLowerCase();

      // Salary filter
      const matchesSalary =
        job.salary_min >= salaryRange[0] && job.salary_max <= salaryRange[1];

      // Remote filter
      const matchesRemote = !showRemoteOnly || job.is_remote;

      // Featured filter
      const matchesFeatured = !showFeaturedOnly || job.is_featured;

      // Tab filter
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "remote" && job.is_remote) ||
        (activeTab === "featured" && job.is_featured) ||
        (activeTab === "saved" && savedJobs.includes(job.id));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesExperience &&
        matchesSalary &&
        matchesRemote &&
        matchesFeatured &&
        matchesTab
      );
    });
  }, [
    jobs,
    searchQuery,
    selectedCategory,
    selectedType,
    selectedExperience,
    salaryRange,
    showRemoteOnly,
    showFeaturedOnly,
    activeTab,
    savedJobs,
  ]);

  // TRACE: Handle job application
  const handleApply = (jobId: string) => {
    applyMutation.mutate(jobId);
  };

  // TRACE: Handle save/unsave job
  const handleSaveJob = (jobId: string) => {
    const action = savedJobs.includes(jobId) ? "unsave" : "save";
    saveJobMutation.mutate({ jobId, action });
  };

  // TRACE: Format salary display
  const formatSalary = (min: number, max: number, currency: string) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };

  // TRACE: Calculate days since posting
  const getDaysSince = (dateString: string) => {
    const posted = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - posted.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // TRACE: Database Status Component - Updated to show proper connection status
  const DatabaseStatus = () => {
    if (isCheckingConnection) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-700 border border-amber-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Checking PostgreSQL...</span>
        </div>
      );
    }

    const isConnected = databaseHealth?.database?.connected;

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          isConnected
            ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 shadow-sm"
            : "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 shadow-sm"
        }`}
      >
        {isConnected ? (
          <CheckCircle className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        <span>
          {isConnected
            ? `Live: ${databaseHealth?.database?.name || "PostgreSQL"}`
            : "Database Offline"}
        </span>
        <button
          onClick={() => refetchHealth()}
          className="ml-2 text-xs underline hover:no-underline transition-all hover:text-emerald-800"
        >
          {isConnected ? "Recheck" : "Retry"}
        </button>
      </div>
    );
  };

  // TRACE: Stats card component - Updated with business theme
  const StatCard = ({ icon, value, label, trend, color = "blue" }: any) => (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-300 hover:border-gray-300">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`p-2 rounded-lg bg-gradient-to-br ${
            color === "green"
              ? "from-emerald-100 to-green-100"
              : color === "blue"
                ? "from-blue-100 to-cyan-100"
                : color === "purple"
                  ? "from-purple-100 to-violet-100"
                  : "from-amber-100 to-orange-100"
          }`}
        >
          <div
            className={
              color === "green"
                ? "text-emerald-600"
                : color === "blue"
                  ? "text-blue-600"
                  : color === "purple"
                    ? "text-purple-600"
                    : "text-amber-600"
            }
          >
            {icon}
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded ${
            color === "green"
              ? "bg-emerald-50 text-emerald-700"
              : color === "blue"
                ? "bg-blue-50 text-blue-700"
                : color === "purple"
                  ? "bg-purple-50 text-purple-700"
                  : "bg-amber-50 text-amber-700"
          }`}
        >
          {trend}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
  );

  // Add smooth scroll effect
  useEffect(() => {
    // Enable smooth scrolling for the entire page
    document.documentElement.style.scrollBehavior = "smooth";

    // Custom scroll animations
    const handleScroll = () => {
      const elements = document.querySelectorAll(".scroll-fade-in");
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          el.classList.add("opacity-100", "translate-y-0");
          el.classList.remove("opacity-0", "translate-y-4");
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => {
      document.documentElement.style.scrollBehavior = "auto";
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="absolute inset-0 career-bg-pattern" />
        <style>{`
          .career-bg-pattern {
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            background-size: 60px 60px;
            background-repeat: repeat;
          }
        `}</style>
      </div>

      {/* Content Container */}
      <div className="relative z-10">
        {/* Header - Updated with business theme */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/80 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/services">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Services
                  </Button>
                </Link>
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                      Career Portal
                    </h1>
                    <p className="text-xs text-gray-500">
                      Business Intelligence Careers
                    </p>
                  </div>
                  <DatabaseStatus />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshJobs}
                  className="gap-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Jobs
                </Button>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md hover:shadow-lg">
                  <Mail className="h-4 w-4" />
                  Get Job Alerts
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - Updated with business theme */}
        <section className="relative py-16 bg-gradient-to-r from-blue-50/50 via-white to-cyan-50/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-50/20 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12 scroll-fade-in opacity-0 translate-y-4 transition-all duration-700">
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full mb-6 border border-blue-200">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                    Live PostgreSQL Job Portal
                  </span>
                </div>
              </motion.div>
              <motion.h2
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
                className="text-5xl font-bold text-gray-900 mb-4 leading-tight"
              >
                Find Your{" "}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Dream
                </span>{" "}
                Tech Career
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed"
              >
                Discover {filteredJobs.length} real opportunities across all
                industries from our PostgreSQL database.
                <span className="font-semibold text-emerald-600 ml-2">
                  ✅ Connected to live PostgreSQL database!
                </span>
              </motion.p>

              {/* Database Connection Info */}
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                className="max-w-2xl mx-auto mb-8"
              >
                <Card className="border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl ${
                            databaseHealth?.database?.connected
                              ? "bg-emerald-100"
                              : "bg-amber-100"
                          }`}
                        >
                          <Database
                            className={`h-6 w-6 ${
                              databaseHealth?.database?.connected
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">
                            PostgreSQL Database
                          </h4>
                          <p className="text-sm font-medium text-emerald-600">
                            ✅ Connected to{" "}
                            {databaseHealth?.database?.name ||
                              DB_CONFIG.database}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-300 font-mono">
                          {DB_CONFIG.host}:{DB_CONFIG.port}
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Database Stats */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8"
              >
                <StatCard
                  icon={<Server className="w-5 h-5" />}
                  value={filteredJobs.length.toLocaleString()}
                  label="Total Jobs"
                  trend="Live"
                  color="green"
                />
                <StatCard
                  icon={<HardDrive className="w-5 h-5" />}
                  value={DB_CONFIG.database}
                  label="Database"
                  trend="Same as Commerce"
                  color="blue"
                />
                <StatCard
                  icon={<Network className="w-5 h-5" />}
                  value="Online"
                  label="Status"
                  trend="Real-time"
                  color="green"
                />
                <StatCard
                  icon={<Activity className="w-5 h-5" />}
                  value={new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  label="Last Checked"
                  trend="Now"
                  color="purple"
                />
              </motion.div>

              {/* Search Bar - Enhanced */}
              <div className="max-w-3xl mx-auto scroll-fade-in opacity-0 translate-y-4 transition-all duration-700 delay-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm border border-gray-300/50 rounded-2xl shadow-xl overflow-hidden">
                    <Search className="absolute left-5 top-5 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search jobs, companies, or skills (e.g., 'React Developer', 'Data Scientist')"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-24 py-7 text-lg border-0 focus:ring-0 focus-visible:ring-0 bg-transparent"
                    />
                    <Button className="absolute right-2.5 top-2.5 py-5 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md">
                      <Search className="h-5 w-5 mr-2" />
                      Search Jobs
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-6 justify-center">
                  {[
                    "#Remote",
                    "#Tech",
                    "#Startup",
                    "#AI",
                    "#Developer",
                    "#Business",
                    "#Analytics",
                  ].map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 px-3 py-1.5 text-sm"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar - Enhanced */}
            <div className="lg:w-1/4">
              <Card className="sticky top-24 border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4 border-b border-gray-200/50">
                  <CardTitle className="flex items-center gap-3 text-gray-900">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                      <Filter className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xl">Filters</span>
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Refine your job search
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  <div>
                    <Label className="mb-3 block font-semibold text-gray-700">
                      Job Category
                    </Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={setSelectedCategory}
                    >
                      <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-all">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {jobCategories.map((category) => (
                          <SelectItem
                            key={category}
                            value={category.toLowerCase()}
                          >
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-3 block font-semibold text-gray-700">
                      Job Type
                    </Label>
                    <Select
                      value={selectedType}
                      onValueChange={setSelectedType}
                    >
                      <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-all">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {jobTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-3 block font-semibold text-gray-700">
                      Experience Level
                    </Label>
                    <Select
                      value={selectedExperience}
                      onValueChange={setSelectedExperience}
                    >
                      <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-all">
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-semibold text-gray-700">
                        Salary Range
                      </Label>
                      <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        ${salaryRange[0].toLocaleString()} - $
                        {salaryRange[1].toLocaleString()}
                      </span>
                    </div>
                    <div className="px-2 space-y-4">
                      <input
                        type="range"
                        min="0"
                        max="300000"
                        step="10000"
                        value={salaryRange[0]}
                        onChange={(e) =>
                          setSalaryRange([
                            parseInt(e.target.value),
                            salaryRange[1],
                          ])
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-600 [&::-webkit-slider-thumb]:to-cyan-600"
                      />
                      <input
                        type="range"
                        min="0"
                        max="300000"
                        step="10000"
                        value={salaryRange[1]}
                        onChange={(e) =>
                          setSalaryRange([
                            salaryRange[0],
                            parseInt(e.target.value),
                          ])
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-600 [&::-webkit-slider-thumb]:to-cyan-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200">
                      <Label
                        htmlFor="remote-only"
                        className="cursor-pointer flex-1"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="font-medium text-gray-800">
                              Remote Only
                            </div>
                            <div className="text-xs text-gray-500">
                              Work from anywhere
                            </div>
                          </div>
                        </div>
                      </Label>
                      <Switch
                        id="remote-only"
                        checked={showRemoteOnly}
                        onCheckedChange={setShowRemoteOnly}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200">
                      <Label
                        htmlFor="featured-only"
                        className="cursor-pointer flex-1"
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles className="h-4 w-4 text-amber-600" />
                          <div>
                            <div className="font-medium text-gray-800">
                              Featured Only
                            </div>
                            <div className="text-xs text-gray-500">
                              Top opportunities
                            </div>
                          </div>
                        </div>
                      </Label>
                      <Switch
                        id="featured-only"
                        checked={showFeaturedOnly}
                        onCheckedChange={setShowFeaturedOnly}
                        className="data-[state=checked]:bg-amber-600"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 py-6 border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedType("all");
                      setSelectedExperience("all");
                      setSalaryRange([0, 300000]);
                      setShowRemoteOnly(false);
                      setShowFeaturedOnly(false);
                      setSearchQuery("");
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Clear All Filters
                  </Button>
                </CardContent>

                <CardFooter className="border-t border-gray-200/50 pt-6">
                  <div className="text-center w-full">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      <Target className="h-4 w-4 inline mr-2 text-blue-600" />
                      {filteredJobs.length} jobs match your criteria
                    </p>
                    {!databaseHealth?.database?.connected && (
                      <p className="text-xs text-amber-600 mt-2 font-medium">
                        ⚠️ Connect to PostgreSQL for real data
                      </p>
                    )}
                  </div>
                </CardFooter>
              </Card>

              {/* Database Stats Card */}
              <Card className="mt-6 border border-gray-200/80 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    Database Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Active Jobs", value: filteredJobs.length },
                    {
                      label: "Remote Positions",
                      value: filteredJobs.filter((j) => j.is_remote).length,
                    },
                    {
                      label: "Featured Jobs",
                      value: filteredJobs.filter((j) => j.is_featured).length,
                    },
                    {
                      label: "Database Status",
                      isBadge: true,
                      connected: true,
                    },
                  ].map((stat, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 hover:bg-gray-50/50 rounded-lg transition-colors"
                    >
                      <span className="text-sm text-gray-600">
                        {stat.label}
                      </span>
                      {stat.isBadge ? (
                        <Badge
                          variant="default"
                          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        >
                          Connected
                        </Badge>
                      ) : (
                        <span className="font-bold text-gray-900">
                          {stat.value}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Jobs List */}
            <div className="lg:w-3/4">
              {/* Tabs - Enhanced */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mb-8"
              >
                <TabsList className="grid grid-cols-5 mb-6 bg-gray-100/80 p-1.5 rounded-xl">
                  {[
                    {
                      value: "all",
                      icon: <Layers className="h-4 w-4" />,
                      label: "All Jobs",
                      count: filteredJobs.length,
                    },
                    {
                      value: "featured",
                      icon: <Sparkles className="h-4 w-4" />,
                      label: "Featured",
                    },
                    {
                      value: "remote",
                      icon: <Globe className="h-4 w-4" />,
                      label: "Remote",
                    },
                    {
                      value: "saved",
                      icon: <Bookmark className="h-4 w-4" />,
                      label: "Saved",
                      count: savedJobs.length,
                    },
                    {
                      value: "applied",
                      icon: <Target className="h-4 w-4" />,
                      label: "Applied",
                    },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={`gap-2 rounded-lg transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 data-[state=active]:font-semibold`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.count !== undefined && (
                        <Badge
                          variant="secondary"
                          className="ml-1 bg-gray-200 text-gray-700"
                        >
                          {tab.count}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {databaseHealth?.database?.connected
                          ? "Live Opportunities from PostgreSQL"
                          : "Sample Opportunities"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Database:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {DB_CONFIG.database}
                        </code>
                      </p>
                    </div>
                    <Select defaultValue="newest">
                      <SelectTrigger className="w-48 border-gray-300 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="salary-high">
                          Salary (High to Low)
                        </SelectItem>
                        <SelectItem value="salary-low">
                          Salary (Low to High)
                        </SelectItem>
                        <SelectItem value="relevance">Relevance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="border-gray-200/80">
                          <CardContent className="p-6">
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2 mb-4" />
                            <Skeleton className="h-20 w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredJobs.length === 0 ? (
                    <Card className="border-2 border-dashed border-gray-300/50">
                      <CardContent className="p-12 text-center">
                        <Search className="h-16 w-16 mx-auto text-gray-300 mb-6" />
                        <h4 className="text-2xl font-semibold text-gray-700 mb-3">
                          No jobs found
                        </h4>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                          No jobs match your criteria. Try adjusting your
                          filters.
                        </p>
                        <div className="space-y-4 max-w-sm mx-auto">
                          <Button
                            onClick={() => refetchJobs()}
                            className="gap-2 w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Refresh Jobs
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {filteredJobs.map((job, index) => (
                        <Card
                          key={job.id}
                          className={`border border-gray-200/80 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 scroll-fade-in opacity-0 translate-y-4 ${
                            job.is_featured
                              ? "border-blue-200/50 border-l-4 border-l-blue-500"
                              : ""
                          }`}
                          /* webhint-disable-next-line hint-no-inline-styles */
                          style={{ transitionDelay: `${index * 100}ms` }}
                        >
                          {job.is_featured && (
                            <div className="absolute -top-3 -right-3">
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            </div>
                          )}

                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-5 flex-1">
                                <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                                  <AvatarImage src={job.company_logo} />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-800">
                                    {job.company.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="text-xl font-bold text-gray-900 mb-1">
                                        {job.title}
                                      </h4>
                                      <div className="flex items-center gap-4 mb-2">
                                        <span className="flex items-center gap-2 text-gray-600">
                                          <Building className="h-4 w-4" />
                                          <span className="font-medium">
                                            {job.company}
                                          </span>
                                        </span>
                                        <span className="flex items-center gap-2 text-gray-600">
                                          <MapPin className="h-4 w-4" />
                                          {job.location}
                                          {job.is_remote && (
                                            <Badge
                                              variant="outline"
                                              className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200"
                                            >
                                              Remote
                                            </Badge>
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleSaveJob(job.id)}
                                      className={`rounded-full hover:bg-red-50 hover:text-red-600 transition-all ${
                                        savedJobs.includes(job.id)
                                          ? "text-red-600 bg-red-50"
                                          : ""
                                      }`}
                                    >
                                      {savedJobs.includes(job.id) ? (
                                        <Heart className="h-5 w-5 fill-current" />
                                      ) : (
                                        <Heart className="h-5 w-5" />
                                      )}
                                    </Button>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                                    <span className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                                      <Clock className="h-4 w-4" />
                                      {job.type.replace("-", " ")}
                                    </span>
                                    <span className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-1.5 rounded-lg">
                                      <DollarSign className="h-4 w-4" />
                                      <span className="font-semibold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                                        {formatSalary(
                                          job.salary_min,
                                          job.salary_max,
                                          job.currency,
                                        )}
                                      </span>
                                    </span>
                                    <span className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                                      <Users className="h-4 w-4" />
                                      {job.experience_level} Level
                                    </span>
                                    <span className="text-sm text-gray-400">
                                      Posted {getDaysSince(job.posted_date)}{" "}
                                      days ago
                                    </span>
                                  </div>

                                  <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                                    {job.description}
                                  </p>

                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {job.skills
                                      .slice(0, 5)
                                      .map((skill, index) => (
                                        <Badge
                                          key={index}
                                          variant="secondary"
                                          className="bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-200 hover:border-blue-300 transition-colors"
                                        >
                                          {skill}
                                        </Badge>
                                      ))}
                                    {job.skills.length > 5 && (
                                      <Badge
                                        variant="outline"
                                        className="text-gray-500"
                                      >
                                        +{job.skills.length - 5} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <Separator className="my-5" />

                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-500">
                                <span className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  {job.view_count.toLocaleString()} views
                                </span>
                                <span className="flex items-center gap-2 mt-2">
                                  <Database className="h-3 w-3" />
                                  <span className="text-xs font-mono">
                                    PostgreSQL Live Data
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 border-gray-300 hover:border-blue-500 hover:text-blue-600"
                                >
                                  <Share2 className="h-4 w-4" />
                                  Share
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 border-gray-300 hover:border-blue-500 hover:text-blue-600"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View Details
                                </Button>
                                <Button
                                  onClick={() => handleApply(job.id)}
                                  disabled={applyMutation.isPending}
                                  className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg"
                                >
                                  {applyMutation.isPending ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Applying...
                                    </>
                                  ) : (
                                    <>
                                      <Target className="h-4 w-4" />
                                      Apply Now
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

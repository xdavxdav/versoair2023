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
  Star,
  Calendar,
  MessageCircle,
  HardHat,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import EmailSubscribeCTA from "@/components/EmailSubscribeCTA";
import {
  JobApplicationModal,
  type ApplicationJob,
} from "@/components/job-application-modal";

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
  sector: string; // commerce, hotellerie, batiment, automobile, finances, divertissement, sante, tech, general
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
  business_id?: number | null;
  company_rating?: number | null;
  company_review_count?: number;
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

// TRACE: Sector definitions with labels, colors and icons
const SECTORS = [
  {
    value: "all",
    label: "All Sectors",
    color: "bg-gray-200 text-gray-900 border-gray-400",
    gradient: "from-gray-600 to-gray-700",
  },
  {
    value: "communication",
    label: "Communication & Publicité",
    color: "bg-orange-200 text-orange-900 border-orange-400",
    gradient: "from-orange-600 to-amber-600",
  },
  {
    value: "tech",
    label: "Tech / IT",
    color: "bg-cyan-200 text-cyan-900 border-cyan-400",
    gradient: "from-cyan-600 to-blue-600",
  },
  {
    value: "immobilier",
    label: "Immobilier",
    color: "bg-emerald-200 text-emerald-900 border-emerald-400",
    gradient: "from-emerald-600 to-green-600",
  },
  {
    value: "conseil-juridique",
    label: "Conseil & Juridique",
    color: "bg-indigo-200 text-indigo-900 border-indigo-400",
    gradient: "from-indigo-600 to-violet-600",
  },
  {
    value: "sante",
    label: "Santé",
    color: "bg-rose-200 text-rose-900 border-rose-400",
    gradient: "from-rose-600 to-pink-600",
  },
  {
    value: "alimentation",
    label: "Alimentation & Restauration",
    color: "bg-red-200 text-red-900 border-red-400",
    gradient: "from-red-600 to-orange-600",
  },
  {
    value: "animaux",
    label: "Animaux",
    color: "bg-amber-200 text-amber-900 border-amber-400",
    gradient: "from-amber-600 to-yellow-600",
  },
  {
    value: "artisans",
    label: "Artisans",
    color: "bg-slate-200 text-slate-900 border-slate-400",
    gradient: "from-slate-600 to-gray-600",
  },
  {
    value: "maison-deco",
    label: "Maison & Décoration",
    color: "bg-teal-200 text-teal-900 border-teal-400",
    gradient: "from-teal-600 to-emerald-600",
  },
  {
    value: "mode-textile",
    label: "Mode & Textile",
    color: "bg-fuchsia-200 text-fuchsia-900 border-fuchsia-400",
    gradient: "from-fuchsia-600 to-pink-600",
  },
  {
    value: "telecom",
    label: "Télécommunications",
    color: "bg-blue-200 text-blue-900 border-blue-400",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    value: "agroalimentaire",
    label: "Agroalimentaire",
    color: "bg-lime-200 text-lime-900 border-lime-400",
    gradient: "from-lime-600 to-green-600",
  },
  {
    value: "administrations",
    label: "Administrations",
    color: "bg-sky-200 text-sky-900 border-sky-400",
    gradient: "from-sky-600 to-blue-600",
  },
  {
    value: "associations",
    label: "Associations",
    color: "bg-violet-200 text-violet-900 border-violet-400",
    gradient: "from-violet-600 to-purple-600",
  },
  {
    value: "bien-etre",
    label: "Bien-être & Beauté",
    color: "bg-pink-200 text-pink-900 border-pink-400",
    gradient: "from-pink-600 to-rose-600",
  },
  {
    value: "emploi",
    label: "Emploi & RH",
    color: "bg-emerald-200 text-emerald-900 border-emerald-400",
    gradient: "from-emerald-600 to-teal-600",
  },
  {
    value: "commerce",
    label: "Commerce",
    color: "bg-orange-200 text-orange-900 border-orange-400",
    gradient: "from-orange-700 to-yellow-600",
  },
  {
    value: "hotellerie",
    label: "Hôtellerie & Tourisme",
    color: "bg-purple-200 text-purple-900 border-purple-400",
    gradient: "from-purple-600 to-violet-600",
  },
  {
    value: "batiment",
    label: "Bâtiment & Construction",
    color: "bg-yellow-200 text-yellow-900 border-yellow-400",
    gradient: "from-yellow-600 to-amber-700",
  },
  {
    value: "automobile",
    label: "Automobile & Transport",
    color: "bg-red-200 text-red-900 border-red-400",
    gradient: "from-red-700 to-rose-600",
  },
  {
    value: "finances",
    label: "Finances & Assurances",
    color: "bg-green-200 text-green-900 border-green-400",
    gradient: "from-green-600 to-emerald-600",
  },
  {
    value: "divertissement",
    label: "Divertissement & Sport",
    color: "bg-pink-200 text-pink-900 border-pink-400",
    gradient: "from-pink-600 to-fuchsia-600",
  },
  {
    value: "autres",
    label: "Autres Services",
    color: "bg-gray-200 text-gray-800 border-gray-400",
    gradient: "from-gray-600 to-slate-600",
  },
  {
    value: "general",
    label: "General",
    color: "bg-neutral-200 text-neutral-900 border-neutral-400",
    gradient: "from-neutral-600 to-gray-600",
  },
] as const;

const getSectorDef = (sector: string) =>
  SECTORS.find((s) => s.value === sector) || SECTORS[SECTORS.length - 1];

export default function Careers() {
  /* ── Main Platform auth ── */
  const { user: platformUser, token: authToken } = useAuthContext();

  /* ── Application modal state ── */
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJob, setApplyingJob] = useState<ApplicationJob | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [sectorOpen, setSectorOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [salaryRange, setSalaryRange] = useState([0, 300000]);
  const [showRemoteOnly, setShowRemoteOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [blogAuth, setBlogAuth] = useState(() => ({
    connected: localStorage.getItem("blog_community_auth") === "true",
    user: localStorage.getItem("blog_community_user") || "",
  }));
  // Shared auth with Contractors page
  const [careersAuth, setCareersAuth] = useState(() => ({
    on: localStorage.getItem("careers_auth") === "true",
    user: localStorage.getItem("careers_auth_user") || "",
    role: (localStorage.getItem("careers_auth_role") || "job-seeker") as
      | "job-seeker"
      | "contractor",
  }));
  const [showCareersAuth, setShowCareersAuth] = useState(false);
  const [careersForm, setCareersForm] = useState({
    name: "",
    email: "",
    role: "job-seeker" as "job-seeker" | "contractor",
  });

  const handleCareersSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("careers_auth", "true");
    localStorage.setItem("careers_auth_user", careersForm.name);
    localStorage.setItem("careers_auth_role", careersForm.role);
    setCareersAuth({
      on: true,
      user: careersForm.name,
      role: careersForm.role,
    });
    setShowCareersAuth(false);
  };
  const handleCareersSignOut = () => {
    localStorage.removeItem("careers_auth");
    localStorage.removeItem("careers_auth_user");
    localStorage.removeItem("careers_auth_role");
    setCareersAuth({ on: false, user: "", role: "job-seeker" });
  };
  const flipCareersRole = () => {
    const nr =
      careersAuth.role === "job-seeker"
        ? ("contractor" as const)
        : ("job-seeker" as const);
    localStorage.setItem("careers_auth_role", nr);
    setCareersAuth((p) => ({ ...p, role: nr }));
  };

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

        const jobs = Array.isArray(data) ? data : data.data || [];
        return jobs;
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
        job.title.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
        job.skills.some((skill) =>
          skill.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );

      // Category filter
      const matchesCategory =
        selectedCategory === "all" ||
        (job.department &&
          job.department
            .toLowerCase()
            .includes(selectedCategory.toLowerCase()));

      // Sector filter
      const matchesSector =
        selectedSector === "all" ||
        (job.sector && job.sector === selectedSector);

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
        matchesSector &&
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
    selectedSector,
    selectedType,
    selectedExperience,
    salaryRange,
    showRemoteOnly,
    showFeaturedOnly,
    activeTab,
    savedJobs,
  ]);

  // TRACE: Handle job application — auth-gated, opens multi-step modal
  const handleApply = (job: Job) => {
    if (!platformUser || !authToken) {
      toast({
        title: "Authentication Required",
        description: (
          <span>
            You need to sign in to your account before applying for jobs.{" "}
            <a
              href="/signin?redirect=/services/careers"
              className="underline font-semibold hover:text-white"
            >
              Create an account or sign in
            </a>{" "}
            to get started.
          </span>
        ),
        variant: "destructive",
      });
      return;
    }
    setApplyingJob(job as ApplicationJob);
    setShowApplyModal(true);
  };

  // TRACE: Handle save/unsave job
  const handleSaveJob = (jobId: string) => {
    const action = savedJobs.includes(jobId) ? "unsave" : "save";
    saveJobMutation.mutate({ jobId, action });
  };

  // TRACE: Format salary display
  const formatSalary = (
    min: number | null | undefined,
    max: number | null | undefined,
    currency: string | null | undefined,
  ) => {
    // Handle missing salary data gracefully
    if ((!min && !max) || (min === 0 && max === 0)) {
      return "Salary Negotiable";
    }
    const cur = currency || "USD";
    try {
      const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      if (min && !max) return `From ${formatter.format(min)}`;
      if (!min && max) return `Up to ${formatter.format(max)}`;
      return `${formatter.format(min!)} - ${formatter.format(max!)}`;
    } catch {
      // Fallback for invalid currency codes
      if (min && max)
        return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
      return "Salary Negotiable";
    }
  };

  // TRACE: Format experience level for display
  const formatExperienceLevel = (level: string | null | undefined): string => {
    if (!level || level.trim() === "") return "All Levels";
    const map: Record<string, string> = {
      entry: "Entry",
      mid: "Mid",
      senior: "Senior",
      executive: "Executive",
      junior: "Junior",
      lead: "Lead",
    };
    return (
      map[level.toLowerCase()] || level.charAt(0).toUpperCase() + level.slice(1)
    );
  };

  // TRACE: Format job type for display
  const formatJobType = (type: string | null | undefined): string => {
    if (!type) return "Full Time";
    return type
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-300 hover:border-gray-300 overflow-hidden min-w-0">
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
      <div className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1 break-all leading-tight">
        {value}
      </div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
  );

  // Format a date string to readable date + time
  const formatDateTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return { date: "N/A", time: "" };
      return {
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: "N/A", time: "" };
    }
  };

  // Star rating display component
  const StarRating = ({
    rating,
    count,
  }: {
    rating: number | null | undefined;
    count: number;
  }) => {
    if (!rating && count === 0) {
      return (
        <span className="flex items-center gap-1 text-gray-400 text-xs">
          <MessageCircle className="h-3 w-3" />
          No reviews yet
        </span>
      );
    }
    const stars = Math.round(rating || 0);
    return (
      <span className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i <= stars ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
          />
        ))}
        <span className="text-xs font-medium text-gray-600 ml-1">
          {rating?.toFixed(1)} ({count})
        </span>
      </span>
    );
  };

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
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/services">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 px-2 sm:px-3"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Services</span>
                  </Button>
                </Link>
                <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                      Career Portal
                    </h1>
                    <p className="text-xs text-gray-500 hidden sm:block">
                      Business Intelligence Careers
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <DatabaseStatus />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3">
                {careersAuth.on && (
                  <button
                    onClick={flipCareersRole}
                    className={
                      "hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all " +
                      (careersAuth.role === "job-seeker"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : "bg-amber-100 text-amber-800 border-amber-300")
                    }
                  >
                    {careersAuth.role === "job-seeker" ? (
                      <Briefcase className="h-3.5 w-3.5" />
                    ) : (
                      <HardHat className="h-3.5 w-3.5" />
                    )}
                    {careersAuth.role === "job-seeker"
                      ? "Job Seeker"
                      : "Contractor"}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshJobs}
                  className="gap-1 sm:gap-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-200 px-2 sm:px-3"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh Jobs</span>
                </Button>
                {careersAuth.on ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {careersAuth.user}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCareersSignOut}
                      className="text-gray-500 hover:text-red-600"
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowCareersAuth(true)}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <User className="h-4 w-4" />
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - Updated with business theme */}
        <section className="relative py-8 sm:py-12 lg:py-16 bg-gradient-to-r from-blue-50/50 via-white to-cyan-50/50 overflow-hidden">
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
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight"
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
                className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto mb-4 sm:mb-8 leading-relaxed px-2"
              >
                Discover {filteredJobs.length} real opportunities across all
                industries.
                <span className="font-semibold text-emerald-600 ml-2 hidden sm:inline">
                  ✅ Updated in real time
                </span>
              </motion.p>

              {/* Database Connection Info */}
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                className="max-w-2xl mx-auto mb-4 sm:mb-8 hidden sm:block"
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
                className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 max-w-3xl mx-auto mb-4 sm:mb-8 px-2 sm:px-0"
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
                  trend="Wider Scope"
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

        {/* 📬 Job Alerts Subscribe CTA */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-6">
          <EmailSubscribeCTA
            channelType="job_alerts"
            userId={platformUser?.id}
            onAuthRequired={() =>
              toast({
                title: "Sign in required",
                description:
                  "Create an account or sign in to subscribe to job alerts.",
              })
            }
          />
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar - Collapsible on mobile */}
            <div className="w-full lg:w-1/4">
              {/* Mobile filter toggle */}
              <Button
                variant="outline"
                className="w-full lg:hidden mb-3 gap-2 border-gray-300"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
                <Badge variant="secondary" className="ml-auto">
                  {filteredJobs.length}
                </Badge>
              </Button>
              <Card
                className={`sticky top-24 border border-gray-200/80 shadow-lg hover:shadow-xl transition-all duration-300 ${showFilters ? "block" : "hidden lg:block"}`}
              >
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
                      Sector
                    </Label>
                    <Select
                      value={selectedSector}
                      onValueChange={setSelectedSector}
                    >
                      <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 transition-all">
                        <SelectValue placeholder="All Sectors" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            <span className="flex items-center gap-2">
                              {s.value !== "all" && (
                                <span
                                  className={`inline-block h-2 w-2 rounded-full bg-gradient-to-r ${s.gradient}`}
                                />
                              )}
                              {s.label}
                            </span>
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
                      setSelectedSector("all");
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

              {/* Blog Community Card */}
              <Card className="mt-6 border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
                <CardContent className="pt-5 pb-5">
                  {blogAuth.connected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {blogAuth.user.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {blogAuth.user}
                          </p>
                          <p className="text-xs text-emerald-600 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Connected to Community
                          </p>
                        </div>
                      </div>
                      <Link href="/blog">
                        <Button
                          variant="outline"
                          className="w-full gap-2 text-sm border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Open Community Feed
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3 text-center">
                      <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Join the Community
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Connect with professionals, share insights & grow your
                          network
                        </p>
                      </div>
                      <Link href="/blog">
                        <Button className="w-full gap-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md transition-all">
                          <Users className="h-4 w-4" />
                          Sign In to Community
                        </Button>
                      </Link>
                      <p className="text-[11px] text-gray-400">
                        Like LinkedIn — post, comment & connect
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Jobs List */}
            <div className="lg:w-3/4">
              {/* Sector Quick Filter — Searchable Dropdown */}
              <div className="mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">
                    Sector:
                  </span>
                  <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[230px] justify-between ${
                          selectedSector !== "all"
                            ? `bg-gradient-to-r ${getSectorDef(selectedSector).gradient} text-white border-transparent shadow-md`
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 shadow-sm"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {selectedSector !== "all" && (
                            <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                          )}
                          {getSectorDef(selectedSector).label}
                        </span>
                        <ChevronRight
                          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                            sectorOpen ? "rotate-90" : ""
                          } ${selectedSector !== "all" ? "text-white/70" : "text-gray-400"}`}
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[270px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search sector…"
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No sector found.</CommandEmpty>
                          <CommandGroup>
                            {SECTORS.map((s) => {
                              const isActive = selectedSector === s.value;
                              return (
                                <CommandItem
                                  key={s.value}
                                  value={s.label}
                                  onSelect={() => {
                                    setSelectedSector(s.value);
                                    setSectorOpen(false);
                                  }}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <span
                                    className={`inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r ${s.gradient} shrink-0`}
                                  />
                                  <span
                                    className={isActive ? "font-semibold" : ""}
                                  >
                                    {s.label}
                                  </span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Tabs - Enhanced */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mb-8"
              >
                <TabsList className="grid grid-cols-3 sm:grid-cols-5 mb-4 sm:mb-6 bg-gray-100/80 p-1 sm:p-1.5 rounded-xl">
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
                      className={`gap-1 sm:gap-2 rounded-lg transition-all duration-300 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700 data-[state=active]:font-semibold`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-8 gap-3">
                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">
                        Available Opportunities
                      </h3>
                      <p className="text-sm text-gray-500">
                        Showing {filteredJobs.length} matching positions
                      </p>
                    </div>
                    <Select defaultValue="newest">
                      <SelectTrigger className="w-full sm:w-48 border-gray-300 focus:ring-blue-500">
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
                                    {/* Sector badge */}
                                    {(() => {
                                      const sd = getSectorDef(
                                        job.sector || "general",
                                      );
                                      return (
                                        <span
                                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${sd.color}`}
                                        >
                                          <span
                                            className={`inline-block h-2 w-2 rounded-full bg-gradient-to-r ${sd.gradient}`}
                                          />
                                          {sd.label}
                                        </span>
                                      );
                                    })()}
                                    <span className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                                      <Clock className="h-4 w-4" />
                                      {formatJobType(job.type)}
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
                                      {formatExperienceLevel(
                                        job.experience_level,
                                      )}{" "}
                                      Level
                                    </span>
                                    <span
                                      className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg"
                                      title={`Posted: ${formatDateTime(job.posted_date || job.created_at).date} at ${formatDateTime(job.posted_date || job.created_at).time}`}
                                    >
                                      <Calendar className="h-4 w-4" />
                                      {
                                        formatDateTime(
                                          job.posted_date || job.created_at,
                                        ).date
                                      }{" "}
                                      ·{" "}
                                      {
                                        formatDateTime(
                                          job.posted_date || job.created_at,
                                        ).time
                                      }
                                    </span>
                                    <span className="text-sm text-gray-400">
                                      (
                                      {getDaysSince(
                                        job.posted_date || job.created_at,
                                      )}{" "}
                                      days ago)
                                    </span>
                                  </div>

                                  {/* Company Reviews */}
                                  <div className="flex items-center gap-3 mb-4">
                                    <StarRating
                                      rating={job.company_rating}
                                      count={job.company_review_count || 0}
                                    />
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
                                  <Clock className="h-3 w-3" />
                                  <span className="text-xs">
                                    Added {formatDateTime(job.created_at).date}{" "}
                                    at {formatDateTime(job.created_at).time}
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
                                  onClick={() => handleApply(job)}
                                  className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg"
                                >
                                  <Target className="h-4 w-4" />
                                  Apply Now
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

      {/* ── Shared Careers / Contractors Auth Modal ── */}
      {showCareersAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* header */}
            <div
              className={`p-6 text-white ${careersAuth.role === "contractor" ? "bg-gradient-to-r from-amber-600 to-orange-600" : "bg-gradient-to-r from-blue-600 to-cyan-600"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {careersAuth.role === "contractor"
                    ? "Contractor Sign In"
                    : "Job Seeker Sign In"}
                </h2>
                <button
                  onClick={() => setShowCareersAuth(false)}
                  className="text-white/80 hover:text-white text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              {/* role toggle */}
              <div className="flex bg-white/20 rounded-lg p-1 gap-1">
                <button
                  onClick={() => flipCareersRole()}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${careersAuth.role === "job-seeker" ? "bg-white text-blue-700 shadow" : "text-white/80 hover:text-white"}`}
                >
                  <Briefcase className="h-4 w-4" /> Job Seeker
                </button>
                <button
                  onClick={() => flipCareersRole()}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${careersAuth.role === "contractor" ? "bg-white text-amber-700 shadow" : "text-white/80 hover:text-white"}`}
                >
                  <HardHat className="h-4 w-4" /> Contractor
                </button>
              </div>
            </div>
            {/* body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  placeholder="Enter your name"
                  value={careersForm.name}
                  onChange={(e) =>
                    setCareersForm({ ...careersForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={careersForm.email}
                  onChange={(e) =>
                    setCareersForm({ ...careersForm, email: e.target.value })
                  }
                />
              </div>
              <Button
                className={`w-full ${careersAuth.role === "contractor" ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700" : "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"}`}
                onClick={handleCareersSignIn}
                disabled={!careersForm.name.trim() || !careersForm.email.trim()}
              >
                <User className="h-4 w-4 mr-2" />
                Sign In as{" "}
                {careersAuth.role === "contractor"
                  ? "Contractor"
                  : "Job Seeker"}
              </Button>
              <div className="text-center text-sm text-gray-500 mt-3">
                {careersAuth.role === "job-seeker" ? (
                  <span>
                    Looking for contract work?{" "}
                    <Link
                      href="/services/contractors"
                      className="text-amber-600 hover:underline font-medium"
                    >
                      Browse Contracts{" "}
                      <ChevronRight className="inline h-3 w-3" />
                    </Link>
                  </span>
                ) : (
                  <span>
                    Looking for full-time roles?{" "}
                    <Link
                      href="/services/careers"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Browse Careers <ChevronRight className="inline h-3 w-3" />
                    </Link>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Application Modal ── */}
      {platformUser && authToken && (
        <JobApplicationModal
          open={showApplyModal}
          onClose={() => {
            setShowApplyModal(false);
            setApplyingJob(null);
          }}
          job={applyingJob}
          user={platformUser}
          token={authToken}
          variant="careers"
          onSubmitSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            toast({
              title: "Application submitted!",
              description: "Your application has been received. Good luck!",
            });
          }}
        />
      )}
    </div>
  );
}

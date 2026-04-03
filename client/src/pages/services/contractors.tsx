import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  ArrowLeft,
  ArrowRight,
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
  Target,
  Heart,
  Bookmark,
  Share2,
  RefreshCw,
  Layers,
  Briefcase,
  Award,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  User,
  Activity,
  Star,
  Calendar,
  MessageCircle,
  HardHat,
  FileText,
  ExternalLink,
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

const API_BASE = "";

const DB_CFG = {
  user: "versoair",
  host: "localhost",
  port: 5432,
  database: "versoair_business_intelligence",
};

interface Contract {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  sector: string;
  salary_min: number;
  salary_max: number;
  currency: string;
  description: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  experience_level: string;
  education_level: string;
  department: string;
  posted_date: string;
  application_deadline: string | null;
  is_featured: boolean;
  is_remote: boolean;
  application_count: number;
  view_count: number;
  status: string;
  company_logo?: string;
  company_description?: string;
  apply_url?: string;
  created_at: string;
  updated_at: string;
  business_id?: number | null;
  company_rating?: number | null;
  company_review_count?: number;
}

interface DbHealth {
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

const CONTRACT_CATS = [
  "Engineering",
  "Design",
  "Marketing",
  "Construction",
  "Finance",
  "IT & Security",
  "Creative",
  "Culinary",
  "Wellness",
  "Real Estate",
];

const EXP_LEVELS = ["Entry", "Mid", "Senior", "Executive"];

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

/* ─── helpers ─── */
function formatRate(
  min: number | null | undefined,
  max: number | null | undefined,
  cur?: string | null,
) {
  if ((!min && !max) || (min === 0 && max === 0)) return "Rate Negotiable";
  const c = cur || "USD";
  try {
    const fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (min && !max) return "From " + fmt.format(min) + "/hr";
    if (!min && max) return "Up to " + fmt.format(max) + "/hr";
    return fmt.format(min!) + "/hr - " + fmt.format(max!) + "/hr";
  } catch {
    return min && max ? "$" + min + "/hr - $" + max + "/hr" : "Rate Negotiable";
  }
}

function formatExp(level: string | null | undefined): string {
  if (!level || level.trim() === "") return "All Levels";
  const m: Record<string, string> = {
    entry: "Entry",
    mid: "Mid",
    senior: "Senior",
    executive: "Executive",
    junior: "Junior",
    lead: "Lead",
  };
  return (
    m[level.toLowerCase()] || level.charAt(0).toUpperCase() + level.slice(1)
  );
}

function daysSince(d: string) {
  return Math.ceil(Math.abs(Date.now() - new Date(d).getTime()) / 86400000);
}

function fmtDt(d: string) {
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return { date: "N/A", time: "" };
    return {
      date: dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: dt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  } catch {
    return { date: "N/A", time: "" };
  }
}

/* ─── sub-components ─── */
function Stars({
  rating,
  count,
}: {
  rating: number | null | undefined;
  count: number;
}) {
  if (!rating && count === 0) {
    return (
      <span className="flex items-center gap-1 text-gray-400 text-xs">
        <MessageCircle className="h-3 w-3" /> No reviews yet
      </span>
    );
  }
  const n = Math.round(rating || 0);
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            "h-3.5 w-3.5 " +
            (i <= n ? "text-amber-400 fill-amber-400" : "text-gray-300")
          }
        />
      ))}
      <span className="text-xs font-medium text-gray-600 ml-1">
        {rating?.toFixed(1)} ({count})
      </span>
    </span>
  );
}

function Stat({ icon, value, label, trend, color = "amber" }: any) {
  const bg =
    color === "green"
      ? "from-emerald-100 to-green-100"
      : color === "purple"
        ? "from-purple-100 to-violet-100"
        : color === "amber"
          ? "from-amber-100 to-orange-100"
          : "from-blue-100 to-cyan-100";
  const fg =
    color === "green"
      ? "text-emerald-600"
      : color === "purple"
        ? "text-purple-600"
        : color === "amber"
          ? "text-amber-600"
          : "text-blue-600";
  const pill =
    color === "green"
      ? "bg-emerald-50 text-emerald-700"
      : color === "purple"
        ? "bg-purple-50 text-purple-700"
        : color === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-blue-50 text-blue-700";
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-300 hover:border-gray-300">
      <div className="flex items-center justify-between mb-3">
        <div className={"p-2 rounded-lg bg-gradient-to-br " + bg}>
          <div className={fg}>{icon}</div>
        </div>
        <span className={"text-xs font-semibold px-2 py-1 rounded " + pill}>
          {trend}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
  );
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function Contractors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selCategory, setSelCategory] = useState("all");
  const [selSector, setSelSector] = useState("all");
  const [sectorOpen, setSectorOpen] = useState(false);
  const [selExp, setSelExp] = useState("all");
  const [rateRange, setRateRange] = useState([0, 200]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  /* Main Platform auth gate */
  const {
    user: platformUser,
    loading: authLoading,
    token: authToken,
    logout: platformLogout,
  } = useAuthContext();

  /* ── Application modal state ── */
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJob, setApplyingJob] = useState<ApplicationJob | null>(null);

  /* local role preference (persisted separately) */
  const [role, setRole] = useState<"job-seeker" | "contractor">(
    () =>
      (localStorage.getItem("careers_auth_role") || "contractor") as
        | "job-seeker"
        | "contractor",
  );
  const flipRole = () => {
    const nr =
      role === "contractor" ? ("job-seeker" as const) : ("contractor" as const);
    localStorage.setItem("careers_auth_role", nr);
    setRole(nr);
    toast({
      title:
        "Switched to " + (nr === "contractor" ? "Contractor" : "Job Seeker"),
    });
  };

  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [checking, setChecking] = useState(true);
  const qc = useQueryClient();

  /* health */
  const { data: hd, refetch: reHealth } = useQuery<DbHealth>({
    queryKey: ["database-health"],
    queryFn: async () => {
      try {
        const r = await fetch(API_BASE + "/api/health");
        if (!r.ok) throw new Error("fail");
        return await r.json();
      } catch {
        return {
          success: false,
          message: "offline",
          database: {
            connected: false,
            name: DB_CFG.database,
            host: DB_CFG.host,
            port: String(DB_CFG.port),
            user: DB_CFG.user,
          },
        };
      }
    },
    retry: 2,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (hd) {
      setDbHealth(hd);
      setChecking(false);
    }
  }, [hd]);

  /* fetch contract jobs */
  const {
    data: contracts = [],
    isLoading,
    refetch: reFetch,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: async () => {
      const r = await fetch(
        API_BASE + "/api/jobs/search?type=contract&limit=100",
      );
      if (!r.ok) throw new Error("fetch fail");
      const d = await r.json();
      return Array.isArray(d) ? d : d.data || [];
    },
    enabled: !checking,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  /* mutations */
  const proposeMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(API_BASE + "/api/jobs/" + id + "/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "current-user",
          applied_date: new Date().toISOString(),
        }),
      });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    onSuccess: () => {
      toast({
        title: "Proposal submitted!",
        description: "Your proposal has been sent to the client.",
      });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (e: Error) => {
      toast({
        title: "Failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const saveMut = useMutation({
    mutationFn: async ({
      cid,
      act,
    }: {
      cid: string;
      act: "save" | "unsave";
    }) => {
      const r = await fetch(API_BASE + "/api/jobs/" + cid + "/" + act, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "current-user" }),
      });
      if (!r.ok) throw new Error("fail");
      return r.json();
    },
    onSuccess: (_, v) => {
      setSaved((p) =>
        v.act === "save" ? [...p, v.cid] : p.filter((x) => x !== v.cid),
      );
      toast({ title: v.act === "save" ? "Contract saved!" : "Removed" });
    },
  });

  /* filter */
  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      if (
        searchQuery &&
        !c.title.toLowerCase().startsWith(searchQuery.toLowerCase()) &&
        !c.company.toLowerCase().startsWith(searchQuery.toLowerCase()) &&
        !c.description.toLowerCase().startsWith(searchQuery.toLowerCase()) &&
        !c.skills.some((s) =>
          s.toLowerCase().startsWith(searchQuery.toLowerCase()),
        )
      )
        return false;
      if (
        selCategory !== "all" &&
        !(
          c.department &&
          c.department.toLowerCase().includes(selCategory.toLowerCase())
        )
      )
        return false;
      if (selSector !== "all" && c.sector !== selSector) return false;
      if (selExp !== "all" && c.experience_level !== selExp.toLowerCase())
        return false;
      if (remoteOnly && !c.is_remote) return false;
      if (featuredOnly && !c.is_featured) return false;
      if (activeTab === "remote" && !c.is_remote) return false;
      if (activeTab === "featured" && !c.is_featured) return false;
      if (activeTab === "saved" && !saved.includes(c.id)) return false;
      return true;
    });
  }, [
    contracts,
    searchQuery,
    selCategory,
    selSector,
    selExp,
    remoteOnly,
    featuredOnly,
    activeTab,
    saved,
  ]);

  const refresh = () => {
    reFetch();
    toast({ title: "Refreshed!", description: "Latest contracts loaded." });
  };

  /* auth helpers */
  const userName = platformUser?.name || platformUser?.email || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  /* scroll fade */
  useEffect(() => {
    const fn = () =>
      document.querySelectorAll(".scroll-fade-in").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight - 100) {
          el.classList.add("opacity-100", "translate-y-0");
          el.classList.remove("opacity-0", "translate-y-4");
        }
      });
    window.addEventListener("scroll", fn);
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* DB status pill */
  const DbPill = () => {
    if (checking)
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-700 border border-amber-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting...
        </div>
      );
    const ok = dbHealth?.database?.connected;
    return (
      <div
        className={
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm " +
          (ok
            ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200"
            : "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200")
        }
      >
        {ok ? (
          <CheckCircle className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        <span className="truncate max-w-[180px]">
          {ok ? "Service Online" : "Service Unavailable"}
        </span>
        <button
          onClick={() => reHealth()}
          className="ml-2 text-xs underline hover:no-underline"
        >
          {ok ? "Recheck" : "Retry"}
        </button>
      </div>
    );
  };

  /* ═════ AUTH GATE ═════ */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-amber-600 mx-auto" />
          <p className="text-gray-500 font-medium">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  if (!platformUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20 relative overflow-hidden">
        {/* bg pattern */}
        <div
          className="absolute inset-0 z-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundSize: "60px 60px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
        >
          {/* amber header bar */}
          <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          <div className="p-10 text-center space-y-6 overflow-hidden">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-inner">
              <HardHat className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Contractor Portal
              </h2>
              <p className="text-gray-500 leading-relaxed">
                Sign in with your Verso Air account to access contract
                opportunities, submit proposals, and track your applications.
              </p>
            </div>

            {/* Primary: Sign In (returning user) */}
            <div className="w-full">
              <Link href="/signin?mode=login&redirect=/services/contractors">
                <Button className="w-full gap-2 py-6 text-base bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all">
                  <User className="h-5 w-5" /> Sign In
                </Button>
              </Link>
            </div>

            {/* divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">
                first time here?
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Secondary: Sign Up (new user) */}
            <div className="w-full">
              <Link href="/signin?redirect=/services/contractors">
                <Button
                  variant="outline"
                  className="w-full gap-2 py-5 text-base border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-all"
                >
                  <ArrowRight className="h-5 w-5" /> Create an Account
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/services">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-500 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Services
                </Button>
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/services/careers">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-blue-600 hover:text-blue-800"
                >
                  <Briefcase className="h-4 w-4" /> Browse Careers
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ═════ RENDER (authenticated) ═════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20 relative overflow-hidden">
      {/* bg pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10">
        {/* ── HEADER ── */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/services">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 px-2 sm:px-3"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Services</span>
                  </Button>
                </Link>
                <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                    <HardHat className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-amber-800 bg-clip-text text-transparent">
                      Contractor Portal
                    </h1>
                    <p className="text-xs text-gray-500 hidden sm:block">
                      Contract & Freelance Opportunities
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <DbPill />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3">
                {platformUser && (
                  <button
                    onClick={flipRole}
                    className={
                      "hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all " +
                      (role === "contractor"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-blue-100 text-blue-800 border-blue-300")
                    }
                  >
                    {role === "contractor" ? (
                      <HardHat className="h-3.5 w-3.5" />
                    ) : (
                      <Briefcase className="h-3.5 w-3.5" />
                    )}
                    {role === "contractor" ? "Contractor" : "Job Seeker"}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  className="gap-1 sm:gap-2 border-gray-300 hover:border-amber-500 hover:text-amber-600 px-2 sm:px-3"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {platformUser ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      {userName}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => platformLogout()}
                      className="text-gray-500 hover:text-red-600"
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Link href="/signin?mode=login&redirect=/services/contractors">
                    <Button className="gap-1 sm:gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md px-3 sm:px-4">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── HERO ── */}
        <section className="relative py-8 sm:py-12 lg:py-16 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 scroll-fade-in opacity-0 translate-y-4 transition-all duration-700">
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full mb-6 border border-amber-200">
                  <HardHat className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                    Contract & Freelance Portal
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
                Find Your Next{" "}
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Contract
                </span>{" "}
                Gig
              </motion.h2>

              <motion.p
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
                className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto mb-4 sm:mb-8 leading-relaxed px-2"
              >
                Discover {filtered.length} contract opportunities across all
                industries.
                <span className="font-semibold text-emerald-600 ml-2 hidden sm:inline">
                  ✅ Updated in real time
                </span>
              </motion.p>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 max-w-3xl mx-auto mb-4 sm:mb-8 px-2 sm:px-0"
              >
                <Stat
                  icon={<FileText className="w-5 h-5" />}
                  value={filtered.length}
                  label="Active Contracts"
                  trend="Available"
                  color="amber"
                />
                <Stat
                  icon={<Globe className="w-5 h-5" />}
                  value={contracts.filter((c) => c.is_remote).length}
                  label="Remote"
                  trend="Flexible"
                  color="green"
                />
                <Stat
                  icon={<Award className="w-5 h-5" />}
                  value={contracts.filter((c) => c.is_featured).length}
                  label="Featured"
                  trend="Premium"
                  color="purple"
                />
                <Stat
                  icon={<Activity className="w-5 h-5" />}
                  value={new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  label="Last Checked"
                  trend="Now"
                  color="amber"
                />
              </motion.div>

              {/* search */}
              <div className="max-w-3xl mx-auto scroll-fade-in opacity-0 translate-y-4 transition-all duration-700 delay-300">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-50" />
                  <div className="relative bg-white/95 backdrop-blur-sm border border-gray-300/50 rounded-2xl shadow-xl overflow-hidden">
                    <Search className="absolute left-5 top-5 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search contracts, companies, or skills..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-24 py-7 text-lg border-0 focus:ring-0 focus-visible:ring-0 bg-transparent"
                    />
                    <Button className="absolute right-2.5 top-2.5 py-5 px-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md">
                      <Search className="h-5 w-5 mr-2" /> Search
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-6 justify-center">
                  {[
                    "#Freelance",
                    "#Remote",
                    "#Construction",
                    "#Tech",
                    "#Design",
                    "#Finance",
                    "#Consulting",
                  ].map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="cursor-pointer hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 px-3 py-1.5 text-sm"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 📬 Contract Alerts Subscribe CTA */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-6">
          <EmailSubscribeCTA
            channelType="contract_alerts"
            userId={platformUser?.id}
            onAuthRequired={() =>
              toast({
                title: "Sign in required",
                description:
                  "Create an account or sign in to subscribe to contract alerts.",
              })
            }
          />
        </div>

        {/* ── MAIN ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ── SIDEBAR ── */}
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
                  {filtered.length}
                </Badge>
              </Button>
              <Card
                className={`sticky top-24 border border-gray-200/80 shadow-lg ${showFilters ? "block" : "hidden lg:block"}`}
              >
                <CardHeader className="pb-4 border-b border-gray-200/50">
                  <CardTitle className="flex items-center gap-3 text-gray-900">
                    <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                      <Filter className="h-5 w-5 text-amber-600" />
                    </div>
                    <span className="text-xl">Filters</span>
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Refine your contract search
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <Label className="mb-3 block font-semibold text-gray-700">
                      Category
                    </Label>
                    <Select value={selCategory} onValueChange={setSelCategory}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CONTRACT_CATS.map((c) => (
                          <SelectItem key={c} value={c.toLowerCase()}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-3 block font-semibold text-gray-700">
                      Sector
                    </Label>
                    <Select value={selSector} onValueChange={setSelSector}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="All Sectors" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            <span className="flex items-center gap-2">
                              {s.value !== "all" && (
                                <span
                                  className={
                                    "inline-block h-2 w-2 rounded-full bg-gradient-to-r " +
                                    s.gradient
                                  }
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
                      Experience Level
                    </Label>
                    <Select value={selExp} onValueChange={setSelExp}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {EXP_LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-semibold text-gray-700">
                        Hourly Rate
                      </Label>
                      <span className="text-sm font-medium bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                        {"$" + rateRange[0] + "/hr - $" + rateRange[1] + "/hr"}
                      </span>
                    </div>
                    <div className="px-2 space-y-4">
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={5}
                        value={rateRange[0]}
                        onChange={(e) =>
                          setRateRange([parseInt(e.target.value), rateRange[1]])
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <input
                        type="range"
                        min={0}
                        max={200}
                        step={5}
                        value={rateRange[1]}
                        onChange={(e) =>
                          setRateRange([rateRange[0], parseInt(e.target.value)])
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200">
                      <Label htmlFor="rmt" className="cursor-pointer flex-1">
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-amber-600" />
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
                        id="rmt"
                        checked={remoteOnly}
                        onCheckedChange={setRemoteOnly}
                        className="data-[state=checked]:bg-amber-600"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200">
                      <Label htmlFor="feat" className="cursor-pointer flex-1">
                        <div className="flex items-center gap-3">
                          <Sparkles className="h-4 w-4 text-amber-600" />
                          <div>
                            <div className="font-medium text-gray-800">
                              Featured Only
                            </div>
                            <div className="text-xs text-gray-500">
                              Premium contracts
                            </div>
                          </div>
                        </div>
                      </Label>
                      <Switch
                        id="feat"
                        checked={featuredOnly}
                        onCheckedChange={setFeaturedOnly}
                        className="data-[state=checked]:bg-amber-600"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 py-6 border-gray-300 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50"
                    onClick={() => {
                      setSelCategory("all");
                      setSelSector("all");
                      setSelExp("all");
                      setRateRange([0, 200]);
                      setRemoteOnly(false);
                      setFeaturedOnly(false);
                      setSearchQuery("");
                    }}
                  >
                    <RefreshCw className="h-4 w-4" /> Clear All Filters
                  </Button>
                </CardContent>
                <CardFooter className="border-t border-gray-200/50 pt-6">
                  <div className="text-center w-full">
                    <p className="text-sm font-medium text-gray-700">
                      <Target className="h-4 w-4 inline mr-2 text-amber-600" />
                      {filtered.length} contracts match
                    </p>
                  </div>
                </CardFooter>
              </Card>

              {/* profile card */}
              <Card className="mt-6 border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
                <CardContent className="pt-5 pb-5">
                  {platformUser ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                          {userInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {userName}
                          </p>
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {role === "contractor"
                              ? "Contractor"
                              : "Job Seeker"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={flipRole}
                        className="w-full gap-1 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        {role === "contractor" ? (
                          <Briefcase className="h-3 w-3" />
                        ) : (
                          <HardHat className="h-3 w-3" />
                        )}
                        Switch to{" "}
                        {role === "contractor" ? "Job Seeker" : "Contractor"}
                      </Button>
                      <Link href="/services/careers">
                        <Button
                          variant="outline"
                          className="w-full gap-2 text-sm border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <Briefcase className="h-4 w-4" /> Browse Full-Time
                          Jobs
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3 text-center">
                      <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        <HardHat className="h-6 w-6 text-amber-600" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        Sign In Required
                      </p>
                      <p className="text-xs text-gray-500">
                        Sign in to submit proposals, save contracts & track bids
                      </p>
                      <Link href="/signin?mode=login&redirect=/services/contractors">
                        <Button className="w-full gap-2 text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md">
                          <User className="h-4 w-4" /> Sign In
                        </Button>
                      </Link>
                      <Link href="/services/careers">
                        <p className="text-[11px] text-blue-600 hover:underline cursor-pointer mt-1">
                          Looking for full-time jobs? Go to Careers →
                        </p>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── CONTRACT LIST ── */}
            <div className="lg:w-3/4">
              {/* sector quick-pick */}
              <div className="mb-5 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">
                  Sector:
                </span>
                <Popover open={sectorOpen} onOpenChange={setSectorOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={
                        "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium min-w-[230px] justify-between transition-all " +
                        (selSector !== "all"
                          ? "bg-gradient-to-r " +
                            getSectorDef(selSector).gradient +
                            " text-white border-transparent shadow-md"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 shadow-sm")
                      }
                    >
                      <span className="flex items-center gap-2 truncate">
                        {selSector !== "all" && (
                          <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                        )}
                        {getSectorDef(selSector).label}
                      </span>
                      <ChevronRight
                        className={
                          "h-3.5 w-3.5 shrink-0 transition-transform " +
                          (sectorOpen ? "rotate-90" : "") +
                          " " +
                          (selSector !== "all"
                            ? "text-white/70"
                            : "text-gray-400")
                        }
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[270px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search sector..."
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>No sector found.</CommandEmpty>
                        <CommandGroup>
                          {SECTORS.map((s) => (
                            <CommandItem
                              key={s.value}
                              value={s.label}
                              onSelect={() => {
                                setSelSector(s.value);
                                setSectorOpen(false);
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <span
                                className={
                                  "inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r " +
                                  s.gradient +
                                  " shrink-0"
                                }
                              />
                              <span
                                className={
                                  selSector === s.value ? "font-semibold" : ""
                                }
                              >
                                {s.label}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mb-8"
              >
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 mb-4 sm:mb-6 bg-gray-100/80 p-1 sm:p-1.5 rounded-xl">
                  {[
                    {
                      v: "all",
                      ic: <Layers className="h-4 w-4" />,
                      lb: "All Contracts",
                      ct: filtered.length,
                    },
                    {
                      v: "featured",
                      ic: <Sparkles className="h-4 w-4" />,
                      lb: "Featured",
                    },
                    {
                      v: "remote",
                      ic: <Globe className="h-4 w-4" />,
                      lb: "Remote",
                    },
                    {
                      v: "saved",
                      ic: <Bookmark className="h-4 w-4" />,
                      lb: "Saved",
                      ct: saved.length,
                    },
                  ].map((t) => (
                    <TabsTrigger
                      key={t.v}
                      value={t.v}
                      className="gap-1 sm:gap-2 rounded-lg text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700 data-[state=active]:font-semibold"
                    >
                      {t.ic}
                      <span className="hidden sm:inline">{t.lb}</span>
                      {t.ct !== undefined && (
                        <Badge
                          variant="secondary"
                          className="ml-1 bg-gray-200 text-gray-700"
                        >
                          {t.ct}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-8 gap-3">
                    <div>
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">
                        Available Contracts
                      </h3>
                      <p className="text-sm text-gray-500">
                        Showing {filtered.length} opportunities matching your
                        criteria
                      </p>
                    </div>
                    <Select defaultValue="newest">
                      <SelectTrigger className="w-full sm:w-48 border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="rate-high">
                          Rate (High→Low)
                        </SelectItem>
                        <SelectItem value="rate-low">
                          Rate (Low→High)
                        </SelectItem>
                        <SelectItem value="relevance">Relevance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isLoading ? (
                    <div className="space-y-4">
                      {[0, 1, 2].map((i) => (
                        <Card key={i} className="border-gray-200/80">
                          <CardContent className="p-6">
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2 mb-4" />
                            <Skeleton className="h-20 w-full" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <Card className="border-2 border-dashed border-gray-300/50">
                      <CardContent className="p-12 text-center">
                        <Search className="h-16 w-16 mx-auto text-gray-300 mb-6" />
                        <h4 className="text-2xl font-semibold text-gray-700 mb-3">
                          No contracts found
                        </h4>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                          Try adjusting your filters.
                        </p>
                        <Button
                          onClick={() => reFetch()}
                          className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 shadow-md"
                        >
                          <RefreshCw className="h-4 w-4" /> Refresh
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {filtered.map((c, idx) => {
                        const sd = getSectorDef(c.sector || "general");
                        const dt = fmtDt(c.posted_date || c.created_at);
                        const ctDt = fmtDt(c.created_at);
                        return (
                          <Card
                            key={c.id}
                            className={
                              "border border-gray-200/80 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 scroll-fade-in opacity-0 translate-y-4 relative " +
                              (c.is_featured
                                ? "border-amber-200/50 border-l-4 border-l-amber-500"
                                : "")
                            }
                            style={{ transitionDelay: idx * 100 + "ms" }}
                          >
                            {c.is_featured && (
                              <div className="absolute -top-3 -right-3 z-10">
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
                                  <Sparkles className="h-3 w-3 mr-1" /> Featured
                                </Badge>
                              </div>
                            )}
                            <CardContent className="p-6">
                              <div className="flex items-start gap-5">
                                <Avatar className="h-16 w-16 border-2 border-white shadow-md">
                                  <AvatarImage src={c.company_logo} />
                                  <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800">
                                    {c.company.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="text-xl font-bold text-gray-900 mb-1">
                                        {c.title}
                                      </h4>
                                      <div className="flex items-center gap-4 mb-2">
                                        <span className="flex items-center gap-2 text-gray-600">
                                          <Building className="h-4 w-4" />
                                          <span className="font-medium">
                                            {c.company}
                                          </span>
                                        </span>
                                        <span className="flex items-center gap-2 text-gray-600">
                                          <MapPin className="h-4 w-4" />{" "}
                                          {c.location}
                                          {c.is_remote && (
                                            <Badge
                                              variant="outline"
                                              className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-200"
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
                                      onClick={() =>
                                        saveMut.mutate({
                                          cid: c.id,
                                          act: saved.includes(c.id)
                                            ? "unsave"
                                            : "save",
                                        })
                                      }
                                      className={
                                        "rounded-full hover:bg-red-50 hover:text-red-600 " +
                                        (saved.includes(c.id)
                                          ? "text-red-600 bg-red-50"
                                          : "")
                                      }
                                    >
                                      <Heart
                                        className={
                                          "h-5 w-5" +
                                          (saved.includes(c.id)
                                            ? " fill-current"
                                            : "")
                                        }
                                      />
                                    </Button>
                                  </div>

                                  {/* badges row */}
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
                                    <span
                                      className={
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border " +
                                        sd.color
                                      }
                                    >
                                      <span
                                        className={
                                          "inline-block h-2 w-2 rounded-full bg-gradient-to-r " +
                                          sd.gradient
                                        }
                                      />
                                      {sd.label}
                                    </span>
                                    <span className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg font-semibold">
                                      <FileText className="h-4 w-4" /> Contract
                                    </span>
                                    <span className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1.5 rounded-lg">
                                      <DollarSign className="h-4 w-4" />
                                      <span className="font-semibold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
                                        {formatRate(
                                          c.salary_min,
                                          c.salary_max,
                                          c.currency,
                                        )}
                                      </span>
                                    </span>
                                    <span className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                                      <Users className="h-4 w-4" />{" "}
                                      {formatExp(c.experience_level)} Level
                                    </span>
                                    <span
                                      className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg"
                                      title={
                                        "Posted: " + dt.date + " at " + dt.time
                                      }
                                    >
                                      <Calendar className="h-4 w-4" /> {dt.date}{" "}
                                      · {dt.time}
                                    </span>
                                    <span className="text-sm text-gray-400">
                                      (
                                      {daysSince(c.posted_date || c.created_at)}{" "}
                                      days ago)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 mb-4">
                                    <Stars
                                      rating={c.company_rating}
                                      count={c.company_review_count || 0}
                                    />
                                  </div>

                                  <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                                    {c.description}
                                  </p>

                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {c.skills.slice(0, 5).map((sk, i) => (
                                      <Badge
                                        key={i}
                                        variant="secondary"
                                        className="bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-200 hover:border-amber-300"
                                      >
                                        {sk}
                                      </Badge>
                                    ))}
                                    {c.skills.length > 5 && (
                                      <Badge
                                        variant="outline"
                                        className="text-gray-500"
                                      >
                                        +{c.skills.length - 5} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <Separator className="my-5" />

                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                  <span className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />{" "}
                                    {c.view_count.toLocaleString()} views
                                  </span>
                                  <span className="flex items-center gap-2 mt-2">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-xs">
                                      Added {ctDt.date} at {ctDt.time}
                                    </span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-gray-300 hover:border-amber-500 hover:text-amber-600"
                                  >
                                    <Share2 className="h-4 w-4" /> Share
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-gray-300 hover:border-amber-500 hover:text-amber-600"
                                  >
                                    <ExternalLink className="h-4 w-4" /> View
                                    Details
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setApplyingJob(
                                        c as unknown as ApplicationJob,
                                      );
                                      setShowApplyModal(true);
                                    }}
                                    className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md hover:shadow-lg"
                                  >
                                    <FileText className="h-4 w-4" /> Submit
                                    Proposal
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* make Featured / Remote / Saved tabs work (they share the same card renderer via activeTab filter) */}
                <TabsContent value="featured" className="mt-0" />
                <TabsContent value="remote" className="mt-0" />
                <TabsContent value="saved" className="mt-0" />
              </Tabs>
            </div>
          </div>
        </div>
      </div>

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
          variant="contractors"
          onSubmitSuccess={() => {
            qc.invalidateQueries({ queryKey: ["contracts"] });
            toast({
              title: "Proposal submitted!",
              description: "Your proposal has been sent to the client.",
            });
          }}
        />
      )}
    </div>
  );
}

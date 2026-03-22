import { useState, useEffect, useMemo, useCallback, useRef } from "react";
/* webhint-disable hint-no-inline-styles */
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import ProgressBar from "@/components/ui/progress-bar";
import {
  Music,
  TrendingUp,
  Users,
  Play,
  Heart,
  Share2,
  Upload,
  Mic,
  Headphones,
  Award,
  Loader2,
  Calendar,
  DollarSign,
  MapPin,
  BarChart3,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  Bell,
  Search,
  Filter,
  ChevronRight,
  Globe,
  Smartphone,
  Music2,
  Volume2,
  Plus,
  ExternalLink,
  Eye,
  MessageSquare,
  Star,
  Zap,
  TrendingDown,
  Package,
  Settings,
  User,
  CreditCard,
  FileText,
  HelpCircle,
  LogOut,
  Shield,
  Lock,
  Unlock,
  PieChart,
  LineChart,
  ShoppingBag,
  Tag,
  Target,
  RefreshCw,
  Copy,
  QrCode,
  Link as LinkIcon,
  Mail,
  Phone,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  Linkedin,
  Radio,
  Disc,
  Mic2,
  Video,
  Image,
  FileMusic,
  FolderPlus,
  Grid,
  List,
  LayoutDashboard,
  ChartBar,
  Wallet,
  Ticket,
  Gift,
  Coffee,
  Music4,
  Album,
  RadioTower,
  Podcast,
  BellRing,
  Megaphone,
  Newspaper,
  Palette,
  Keyboard,
  Monitor,
  Server,
  Database,
  Cloud,
  ShieldCheck,
  BadgeCheck,
  Crown,
  Trophy,
  Sparkles,
  Rocket,
  TargetIcon,
  TrendingUp as TrendingUpIcon,
  Users2,
  BarChart4,
  CalendarDays,
  Briefcase,
  Globe2,
  Building,
  Home,
  Compass,
  Navigation,
  Map,
  Mailbox,
  MessageCircle,
  PhoneCall,
  Video as VideoIcon,
  Camera,
  MicOff,
  Speaker,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Pause,
  RotateCcw,
  MoreHorizontal,
  X,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  EyeOff,
  UploadCloud,
  DownloadCloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Cloudy,
  Wind,
  Thermometer,
  Droplets,
  Umbrella,
  Tornado,
  Snowflake,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudSun,
  CloudMoon,
  CloudSunRain,
  CloudMoonRain,
  CloudRainWind,
  Haze,
  ThermometerSun,
  ThermometerSnowflake,
  Droplet,
  Waves,
  TreePine,
  Mountain,
  Tent,
  Car,
  Bus,
  Train,
  Plane,
  Ship,
  Bike,
  Navigation2,
  NavigationOff,
  Flag,
  Layers,
  Globe as GlobeIcon,
  Smartphone as SmartphoneIcon,
  Tablet,
  Laptop,
  Monitor as MonitorIcon,
  Tv,
  Watch,
  Headphones as HeadphonesIcon,
  Speaker as SpeakerIcon,
  Gamepad2,
  Mouse,
  Keyboard as KeyboardIcon,
  Printer,
  HardDrive,
  Cpu,
  Server as ServerIcon,
  Database as DatabaseIcon,
  Router,
  Wifi,
  Bluetooth,
  Cctv,
  Satellite,
  Radar,
  Antenna,
  Signal,
  Battery,
  Power,
  Plug,
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  AlertTriangle,
  Info,
  Ban,
  Circle,
  CircleCheck,
  CircleX,
  CircleHelp,
  CircleAlert,
  CircleMinus,
  CirclePlus,
  CircleSlash,
  OctagonAlert,
  TriangleAlert,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMusicArtists,
  useMusicTracks,
  useMusicAnalytics,
  useMusicEarnings,
  useInvalidateTracks,
  useMyArtist,
  uploadTrack,
  deleteTrack,
  updateTrackMonetization,
} from "@/hooks/use-music";
import {
  checkAuth,
  login as authLogin,
  logout as authLogout,
} from "@/lib/auth";
import {
  useArtistStats,
  useLeaderboard,
  useCurrentPool,
  useRequestPayout,
  usePayoutHistory,
  useContractStatus,
} from "@/hooks/use-streamroyale";
import StreamRoyaleInfoWindow from "@/components/StreamRoyaleInfoWindow";
import { useStreamTracker } from "@/hooks/use-stream-tracker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DivisionProgress from "@/components/DivisionProgress";

// Mock data types
interface Artist {
  id: string;
  name?: string; // Mock data
  stageName: string;
  genre: string;
  totalStreams?: number; // Mock data
  monthlyListeners?: number; // Mock data
  avatar?: string;
  status?: "active" | "inactive" | "pending";
  earnings?: number; // Mock data
  growth?: number; // Mock data
  socialMedia?: {
    followers: number;
    platform: string;
  }[];
}

interface Track {
  id: string;
  title: string;
  artistId: string | number;
  streams?: number; // Mock data
  playCount?: number;
  duration?: number; // Mock data
  releaseDate?: string; // Mock data
  status?: "published" | "draft" | "scheduled";
  revenue?: number; // Mock data
  platform?: string; // Mock data
  genre?: string; // Mock data
  mood?: string; // Mock data
  bpm?: number; // Mock data
  key?: string; // Mock data
}

interface Analytics {
  totalStreams: number;
  totalRevenue: number;
  monthlyGrowth: number;
  topCountries: { country: string; streams: number }[];
  platformDistribution: { platform: string; percentage: number }[];
  dailyStreams: { date: string; streams: number }[];
}

interface RoyaltyPayment {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "processing";
  description: string;
  platform: string;
}

interface Collaboration {
  id: string;
  artist: string;
  status: "active" | "pending" | "completed";
  track: string;
  revenueShare: number;
  date: string;
}

interface Release {
  id: string;
  title: string;
  type: "single" | "ep" | "album";
  releaseDate: string;
  status: "released" | "scheduled" | "draft";
  streams: number;
  revenue: number;
}

export default function ArtistPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [portalRevealed, setPortalRevealed] = useState(false);
  const [connectedUser, setConnectedUser] = useState<{
    name: string;
    email: string;
    role: string;
    initials: string;
    tier: string;
  }>({ name: "", email: "", role: "", initials: "", tier: "Artiste" });
  const [loginError, setLoginError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [volume, setVolume] = useState([50]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [notifications, setNotifications] = useState<
    {
      id: number;
      title: string;
      description: string;
      time: string;
      read: boolean;
    }[]
  >([]);

  // ── Audio player refs & state ──
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioProgress, setAudioProgress] = useState(0); // 0–100
  const [audioCurrentTime, setAudioCurrentTime] = useState(0); // seconds
  const [audioDuration, setAudioDuration] = useState(0); // seconds

  const { data: artists, isLoading: loadingArtists } = useMusicArtists();
  const { data: tracks, isLoading: loadingTracks } = useMusicTracks();
  const { data: analytics, isLoading: loadingAnalytics } = useMusicAnalytics();
  const { data: earnings } = useMusicEarnings();
  const invalidateTracks = useInvalidateTracks();
  const { data: myArtist } = useMyArtist();

  // ── Stream royalty tracker ──
  const { startStream, completeStream, pauseStream, resumeStream } =
    useStreamTracker();

  // ── Resolve connected user display info ──
  const resolveConnectedUser = useCallback(
    (authUser?: { id?: string; email?: string; role?: string } | null) => {
      // Try artist_profile from localStorage (set during sign-in on welcome page)
      let artistProfile: any = null;
      try {
        const stored = localStorage.getItem("artist_profile");
        if (stored) artistProfile = JSON.parse(stored);
      } catch {
        /* ignore */
      }

      // Try auth_user from localStorage
      let cachedUser: any = null;
      try {
        const stored = localStorage.getItem("auth_user");
        if (stored) cachedUser = JSON.parse(stored);
      } catch {
        /* ignore */
      }

      const displayName =
        artistProfile?.stageName ||
        artistProfile?.name ||
        myArtist?.stageName ||
        authUser?.email?.split("@")[0] ||
        cachedUser?.email?.split("@")[0] ||
        "Artiste";

      const email =
        authUser?.email || artistProfile?.email || cachedUser?.email || "";
      const role =
        authUser?.role || artistProfile?.role || cachedUser?.role || "artist";

      // Build initials from display name
      const initials =
        displayName
          .split(/\s+/)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "VA";

      // Determine tier from role
      const tier =
        role === "superuser" || role === "admin"
          ? "Niveau Pro"
          : role === "premium"
            ? "Premium"
            : "Artiste";

      setConnectedUser({ name: displayName, email, role, initials, tier });
    },
    [myArtist],
  );

  // Re-resolve display name when myArtist hook loads (async, may arrive later)
  useEffect(() => {
    if (myArtist && isLoggedIn) resolveConnectedUser();
  }, [myArtist, isLoggedIn, resolveConnectedUser]);

  // ── Auth check on mount ──
  useEffect(() => {
    // Hydrate in-memory auth token from localStorage before checking
    const storedToken = localStorage.getItem("artist_token");
    if (storedToken) {
      import("@/lib/auth").then(({ setAuthToken }) =>
        setAuthToken(storedToken),
      );
    }

    checkAuth()
      .then((user) => {
        if (user) {
          setIsLoggedIn(true);
          setAuthLoading(false);
          resolveConnectedUser(user);
          setTimeout(() => setPortalRevealed(true), 200);
        } else if (storedToken) {
          // Server session expired but we have a local token — trust the stored profile
          const profile = localStorage.getItem("artist_profile");
          if (profile) {
            setIsLoggedIn(true);
            setAuthLoading(false);
            resolveConnectedUser(JSON.parse(profile));
            setTimeout(() => setPortalRevealed(true), 200);
            return;
          }
          setIsLoggedIn(false);
          setAuthLoading(false);
        } else {
          setIsLoggedIn(false);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        // Even on network error, if we have stored credentials, stay logged in
        const profile = localStorage.getItem("artist_profile");
        if (storedToken && profile) {
          setIsLoggedIn(true);
          setAuthLoading(false);
          resolveConnectedUser(JSON.parse(profile));
          setTimeout(() => setPortalRevealed(true), 200);
        } else {
          setIsLoggedIn(false);
          setAuthLoading(false);
        }
      });
  }, [resolveConnectedUser]);

  // ── Login handler ──
  const handleLogin = useCallback(async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError("Veuillez entrer votre email et mot de passe");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      // Try artist-specific login first
      const res = await fetch("/auth/artist/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (data.success) {
        // Store token in memory for Authorization header
        if (data.token) {
          const { setAuthToken } = await import("@/lib/auth");
          setAuthToken(data.token);
        }
        setIsLoggedIn(true);
        setLoginEmail("");
        setLoginPassword("");
        resolveConnectedUser({ email: loginEmail });
        setTimeout(() => setPortalRevealed(true), 200);
      } else {
        setLoginError(data.message || "Échec de connexion");
      }
    } catch (err: any) {
      setLoginError(err.message || "Erreur réseau");
    } finally {
      setLoginLoading(false);
    }
  }, [loginEmail, loginPassword]);

  // ── Logout handler ──
  const [, navigate] = useLocation();
  const handleLogout = useCallback(async () => {
    await authLogout();
    localStorage.removeItem("artist_token");
    localStorage.removeItem("artist_profile");
    navigate("/artist-portal");
  }, [navigate]);

  // ── StreamRoyale hooks ──
  const { data: artistStats } = useArtistStats();
  const { data: poolData } = useCurrentPool();
  const { data: payoutHistoryData } = usePayoutHistory();
  const { data: contractData } = useContractStatus();
  const payoutMutation = useRequestPayout();
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [leaderboardFilter, setLeaderboardFilter] = useState({
    league: "all",
    page: 1,
  });
  const { data: leaderboardData } = useLeaderboard(leaderboardFilter);

  // ── Upload state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    genre: "",
    description: "",
    price: "0.99",
    bpm: "",
    musicalKey: "",
    mood: "",
  });

  // ── Monetization edit state ──
  const [editingMonetization, setEditingMonetization] = useState<string | null>(
    null,
  );
  const [editPrice, setEditPrice] = useState("");

  // Handle real file upload
  const handleRealUpload = useCallback(async () => {
    if (!uploadFile || !uploadForm.title) return;
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("audio", uploadFile);
    formData.append("title", uploadForm.title);
    formData.append("genre", uploadForm.genre);
    formData.append("description", uploadForm.description);
    formData.append("price", uploadForm.price);
    if (uploadForm.bpm) formData.append("bpm", uploadForm.bpm);
    if (uploadForm.musicalKey)
      formData.append("musicalKey", uploadForm.musicalKey);
    if (uploadForm.mood) formData.append("mood", uploadForm.mood);
    // Attach authenticated artist's ID so the track is linked correctly
    if (myArtist?.id) formData.append("artistId", String(myArtist.id));

    // Simulate progress during upload
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 8, 90));
    }, 200);

    try {
      await uploadTrack(formData);
      clearInterval(progressInterval);
      setUploadProgress(100);
      invalidateTracks();
      // Reset and close
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadProgress(0);
        setIsUploading(false);
        setUploadForm({
          title: "",
          genre: "",
          description: "",
          price: "0.99",
          bpm: "",
          musicalKey: "",
          mood: "",
        });
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
      alert("Échec du téléversement : " + (err.message || "Erreur inconnue"));
    }
  }, [uploadFile, uploadForm, invalidateTracks, myArtist]);

  // Handle track deletion
  const handleDeleteTrack = useCallback(
    async (trackId: number) => {
      if (!confirm("Delete this track? This cannot be undone.")) return;
      try {
        await deleteTrack(trackId);
        invalidateTracks();
      } catch {
        alert("Échec de la suppression du titre");
      }
    },
    [invalidateTracks],
  );

  // Handle monetization update
  const handleUpdatePrice = useCallback(
    async (trackId: number, newPrice: string) => {
      try {
        await updateTrackMonetization(trackId, { price: newPrice });
        invalidateTracks();
        setEditingMonetization(null);
      } catch {
        alert("Échec de la mise à jour du prix");
      }
    },
    [invalidateTracks],
  );

  // ── Derive display data from real API hooks (no mock arrays) ──
  const displayArtists = artists || [];
  const displayTracks = tracks || [];

  // Compute analytics from real data
  const computedAnalytics = useMemo(() => {
    const allTracks = displayTracks;
    const allArtists = displayArtists;
    const tStreams = allTracks.reduce(
      (sum, t) => sum + ((t as any).streams || (t as any).playCount || 0),
      0,
    );
    const tRevenue = allTracks.reduce(
      (sum, t) => sum + parseFloat((t as any).revenue || "0"),
      0,
    );

    // Genre distribution from tracks
    const genreCounts: Record<string, number> = {};
    allTracks.forEach((t) => {
      const g = (t as any).genre || "Other";
      genreCounts[g] =
        (genreCounts[g] || 0) +
        ((t as any).streams || (t as any).playCount || 0);
    });
    const genreDistribution = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, streams]) => ({
        platform: genre,
        percentage: tStreams > 0 ? Math.round((streams / tStreams) * 100) : 0,
      }));

    // Country distribution from artists
    const countryCounts: Record<string, number> = {};
    allArtists.forEach((a) => {
      const c = (a as any).country || "Unknown";
      countryCounts[c] =
        (countryCounts[c] || 0) + ((a as any).totalStreams || 0);
    });
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, streams]) => ({ country, streams }));

    return {
      totalStreams: tStreams,
      totalRevenue: tRevenue,
      monthlyGrowth: 0,
      topCountries,
      platformDistribution: genreDistribution,
      dailyStreams: [] as { date: string; streams: number }[],
    };
  }, [displayTracks, displayArtists]);

  const displayAnalytics = analytics
    ? {
        ...analytics,
        ...computedAnalytics,
        totalStreams:
          computedAnalytics.totalStreams ||
          (analytics as any).totalStreams ||
          0,
      }
    : computedAnalytics;

  // Releases derived from real tracks
  const displayReleases = useMemo(() => {
    return displayTracks.map((t) => ({
      id: String(t.id),
      title: t.title,
      type: ((t as any).type || "single") as "single" | "album" | "ep",
      releaseDate: t.releaseDate
        ? new Date(t.releaseDate).toISOString().split("T")[0]
        : "—",
      status: ((t as any).status === "published"
        ? "released"
        : (t as any).status === "draft"
          ? "draft"
          : "scheduled") as "released" | "scheduled" | "draft",
      streams: (t as any).streams || t.playCount || 0,
      revenue: parseFloat((t as any).revenue || "0"),
    }));
  }, [displayTracks]);

  // Collaborations — no backend, show empty
  const displayCollaborations: Collaboration[] = [];

  // Calculate totals from real data
  const totalStreams = computedAnalytics.totalStreams;
  const totalArtists = displayArtists?.length || 0;
  const totalTracks = displayTracks?.length || 0;
  const totalRevenue = computedAnalytics.totalRevenue;

  // Weekly stats from StreamRoyale
  const weeklyStreams = artistStats?.thisWeek?.streams || 0;
  const walletBal = artistStats?.profile?.walletBalance || 0;
  const lifetimeStreams = artistStats?.profile?.lifetimeStreams || 0;

  // Filter tracks based on search and genre
  const filteredTracks = useMemo(() => {
    return displayTracks.filter((track) => {
      const matchesSearch =
        searchQuery === "" ||
        track.title.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
        displayArtists
          .find((a) => a.id === track.artistId)
          ?.name.toLowerCase()
          .startsWith(searchQuery.toLowerCase());
      const matchesGenre =
        selectedGenre === "all" || (track as any).genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [displayTracks, displayArtists, searchQuery, selectedGenre]);

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handlePlayTrack = useCallback(
    (track: any) => {
      const t = track as Track;
      const hasAudio = !!(track as any).hasAudio || !!(track as any).file_path;

      setCurrentTrack(t);
      setIsPlaying(true);
      setAudioProgress(0);
      setAudioCurrentTime(0);

      if (hasAudio && audioRef.current) {
        const trackId =
          typeof t.id === "string" ? parseInt(t.id, 10) : Number(t.id);
        audioRef.current.src = `/api/music/tracks/${trackId}/stream`;
        audioRef.current.load();
        audioRef.current.play().catch(() => {
          // Autoplay may be blocked — user can click play in the bar
          setIsPlaying(false);
        });
        // Start royalty tracking
        startStream(trackId);
      }
    },
    [startStream],
  );

  const handleTogglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      pauseStream();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      resumeStream();
      setIsPlaying(true);
    }
  }, [isPlaying, currentTrack, pauseStream, resumeStream]);

  const handleSkipTrack = useCallback(
    (direction: "next" | "prev") => {
      if (!currentTrack || !displayTracks.length) return;
      const idx = displayTracks.findIndex(
        (t) => String(t.id) === String(currentTrack.id),
      );
      let nextIdx: number;
      if (direction === "next") {
        nextIdx = idx < displayTracks.length - 1 ? idx + 1 : 0;
      } else {
        nextIdx = idx > 0 ? idx - 1 : displayTracks.length - 1;
      }
      handlePlayTrack(displayTracks[nextIdx]);
    },
    [currentTrack, displayTracks, handlePlayTrack],
  );

  const handleSeek = useCallback(
    (values: number[]) => {
      if (!audioRef.current || !audioDuration) return;
      const pct = values[0];
      const time = (pct / 100) * audioDuration;
      audioRef.current.currentTime = time;
      setAudioProgress(pct);
      setAudioCurrentTime(time);
    },
    [audioDuration],
  );

  // Wire up <audio> events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setAudioProgress(100);
      completeStream();
      // Auto-play next track
      if (currentTrack && displayTracks.length > 1) {
        const idx = displayTracks.findIndex(
          (t) => String(t.id) === String(currentTrack.id),
        );
        if (idx < displayTracks.length - 1) {
          handlePlayTrack(displayTracks[idx + 1]);
        }
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentTrack, displayTracks, completeStream, handlePlayTrack]);

  // Sync volume slider → <audio> element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = (volume[0] ?? 50) / 100;
    }
  }, [volume]);

  const handleUploadTrack = () => {
    setShowUploadModal(true);
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
      case "paid":
      case "active":
        return "bg-green-500/20 text-green-400";
      case "pending":
      case "scheduled":
        return "bg-yellow-500/20 text-yellow-400";
      case "draft":
      case "processing":
        return "bg-blue-500/20 text-blue-400";
      case "inactive":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-purple-500/20 text-purple-400";
    }
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
        <p className="text-purple-200 text-lg">
          Vérification de l'authentification...
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    // Redirect to the welcome page for authentication
    navigate("/artist-portal");
    return null;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={staggerItem}>
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-200 mb-1">
                    Écoutes totales
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(totalStreams)}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">
                      {weeklyStreams > 0
                        ? `+${formatNumber(weeklyStreams)} cette semaine`
                        : "Aucune écoute pour le moment"}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-purple-500/20">
                  <Play className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-200 mb-1">Revenu total</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <div className="flex items-center mt-2">
                    <DollarSign className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">
                      {walletBal > 0
                        ? `${formatCurrency(walletBal)} en portefeuille`
                        : "Aucun revenu pour le moment"}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-green-500/20">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-200 mb-1">
                    Auditeurs mensuels
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(lifetimeStreams)}
                  </p>
                  <div className="flex items-center mt-2">
                    <Users className="h-4 w-4 text-blue-400 mr-1" />
                    <span className="text-blue-400 text-sm">
                      {totalArtists} artiste{totalArtists !== 1 ? "s" : ""} au
                      label
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-blue-500/20">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-200 mb-1">
                    Collaborations actives
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {
                      displayCollaborations.filter(
                        (c: any) => c.status === "active",
                      ).length
                    }
                  </p>
                  <div className="flex items-center mt-2">
                    <Users2 className="h-4 w-4 text-pink-400 mr-1" />
                    <span className="text-pink-400 text-sm">
                      {
                        displayCollaborations.filter(
                          (c: any) => c.status === "pending",
                        ).length
                      }{" "}
                      demandes en attente
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-pink-500/20">
                  <Users2 className="h-6 w-6 text-pink-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Division Progress */}
      <DivisionProgress />

      {/* Charts and Analytics */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Aperçu des écoutes</CardTitle>
            <CardDescription className="text-purple-200">
              Performance des 30 derniers jours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {((displayAnalytics as any)?.dailyStreams || []).length === 0 ? (
              <div className="h-64 flex items-center justify-center text-white/30">
                <div className="text-center">
                  <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>
                    Les données d'écoute apparaîtront ici à mesure que votre
                    musique est écoutée
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-end space-x-1">
                {((displayAnalytics as any)?.dailyStreams || [])
                  .slice(-30)
                  .map((day: any, i: number) => (
                    <TooltipProvider key={i}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {/* webhint-disable-next-line hint-no-inline-styles */}
                          <div
                            className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-sm"
                            style={{
                              height: `${(day.streams / 50000) * 100}%`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatNumber(day.streams)} écoutes</p>
                          <p className="text-xs">{day.date}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
              </div>
            )}
            {((displayAnalytics as any)?.dailyStreams || []).length > 0 && (
              <div className="mt-4 grid grid-cols-7 text-xs text-purple-200">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                  (day) => (
                    <div key={day} className="text-center">
                      {day}
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Répartition par genre</CardTitle>
            <CardDescription className="text-purple-200">
              Répartition des écoutes par genre
            </CardDescription>
          </CardHeader>
          <CardContent>
            {((displayAnalytics as any)?.platformDistribution || []).length ===
            0 ? (
              <div className="flex items-center justify-center py-8 text-white/30">
                <div className="text-center">
                  <Music2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>
                    Téléversez des titres pour voir la répartition par genre
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {((displayAnalytics as any)?.platformDistribution || []).map(
                  (platform: any, i: number) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white">{platform.platform}</span>
                        <span className="text-purple-200">
                          {platform.percentage}%
                        </span>
                      </div>
                      <Progress value={platform.percentage} className="h-2" />
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Tracks & Top Artists */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Titres récents</CardTitle>
              <CardDescription className="text-purple-200">
                Vos dernières sorties
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-purple-200 hover:text-white hover:bg-white/10"
            >
              Voir tout
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayTracks.slice(0, 5).map((track) => {
                const artist = displayArtists.find(
                  (a) => a.id === track.artistId,
                );
                return (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Music2 className="h-5 w-5 text-white" />
                        </div>
                        <button
                          onClick={() => handlePlayTrack(track)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity"
                        >
                          <Play className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      <div>
                        <p className="text-white font-medium">{track.title}</p>
                        <p className="text-purple-200 text-sm">
                          {artist?.name} • {(track as any).genre || "Inconnu"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge
                        className={getStatusColor(
                          (track as any).status || "published",
                        )}
                      >
                        {(track as any).status || "published"}
                      </Badge>
                      <div className="text-right">
                        <p className="text-white font-medium">
                          {formatNumber(
                            (track as any).streams || track.playCount || 0,
                          )}
                        </p>
                        <p className="text-purple-200 text-sm">écoutes</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Top Artistes</CardTitle>
              <CardDescription className="text-purple-200">
                Classement de performance du label
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-purple-200 hover:text-white hover:bg-white/10"
            >
              Voir tout
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayArtists.slice(0, 5).map((artist, index) => (
                <div
                  key={artist.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(artist as any).avatar || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {artist.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-medium">{artist.name}</p>
                        <Badge
                          variant="outline"
                          className="border-purple-400 text-purple-400 text-xs"
                        >
                          {artist.genre}
                        </Badge>
                      </div>
                      <p className="text-purple-200 text-sm">
                        {formatNumber((artist as any).totalStreams || 0)}{" "}
                        écoutes totales
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {((artist as any).growth || 0) > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span
                        className={
                          ((artist as any).growth || 0) > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {((artist as any).growth || 0) > 0 ? "+" : ""}
                        {(artist as any).growth || 0}%
                      </span>
                    </div>
                    <p className="text-purple-200 text-sm">croissance</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  const renderMusic = () => (
    <div className="space-y-6">
      {/* Music Library Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Bibliothèque musicale
          </h2>
          <p className="text-purple-200">Gérez vos titres, albums et sorties</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleUploadTrack}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Upload className="mr-2 h-4 w-4" />
            Téléverser un nouveau titre
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Créer un album
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/5 rounded-xl border border-white/20">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-purple-200" />
          <Input
            placeholder="Rechercher titres, albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-white placeholder-purple-200 w-full sm:w-64"
          />
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white">
              <SelectValue placeholder="Filtrer par genre" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20">
              <SelectItem value="all">Tous les genres</SelectItem>
              <SelectItem value="Electronic">Électronique</SelectItem>
              <SelectItem value="Hip Hop">Hip Hop</SelectItem>
              <SelectItem value="Rock">Rock</SelectItem>
              <SelectItem value="Pop">Pop</SelectItem>
              <SelectItem value="R&B">R&B</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={
                viewMode === "grid"
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-purple-200"
              }
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={
                viewMode === "list"
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-purple-200"
              }
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tracks Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track) => {
            const artist = displayArtists.find((a) => a.id === track.artistId);
            const hasAudio =
              !!(track as any).hasAudio || !!(track as any).file_path;
            const trackRevenue = parseFloat((track as any).revenue || "0");
            const trackDownloads = (track as any).downloads || 0;
            const trackPrice = (track as any).price || "0.99";
            return (
              <Card
                key={track.id}
                className="bg-white/5 backdrop-blur-md border-white/20 overflow-hidden group hover:bg-white/10 transition-all"
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {hasAudio ? (
                        <div className="text-center">
                          <Music2 className="h-14 w-14 text-purple-400/60 mx-auto" />
                          <span className="text-[10px] text-green-400/70 mt-1 block">
                            ♦ TÉLÉVERSÉ
                          </span>
                        </div>
                      ) : (
                        <Music2 className="h-16 w-16 text-white/30" />
                      )}
                    </div>
                    {/* Price tag */}
                    {hasAudio && (
                      <div className="absolute top-3 right-3 bg-green-500/90 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                        ${trackPrice}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                        <Button
                          onClick={() => handlePlayTrack(track)}
                          className="flex-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
                          disabled={!hasAudio}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          Lire
                        </Button>
                        {hasAudio && (
                          <Button
                            onClick={() => {
                              window.open(
                                `/api/music/tracks/${track.id}/download`,
                                "_blank",
                              );
                            }}
                            className="bg-green-600/80 hover:bg-green-500 text-white"
                            size="icon"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-semibold truncate">
                          {track.title}
                        </h3>
                        <p className="text-purple-200 text-sm truncate">
                          {artist?.name || "Inconnu"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-purple-200 hover:text-white hover:bg-white/10"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-gray-900 border-white/20"
                        >
                          {hasAudio && (
                            <DropdownMenuItem
                              className="text-white"
                              onClick={() => handlePlayTrack(track)}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Lire
                            </DropdownMenuItem>
                          )}
                          {hasAudio && (
                            <DropdownMenuItem
                              className="text-white"
                              onClick={() =>
                                window.open(
                                  `/api/music/tracks/${track.id}/download`,
                                  "_blank",
                                )
                              }
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Télécharger
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-white">
                            <Share2 className="mr-2 h-4 w-4" />
                            Partager
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/20" />
                          <DropdownMenuItem
                            className="text-red-400"
                            onClick={() => handleDeleteTrack(Number(track.id))}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Revenue & Downloads bar */}
                    {hasAudio && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="bg-green-500/10 rounded-lg px-2 py-1.5 text-center border border-green-500/20">
                          <p className="text-green-400 font-bold text-sm">
                            {formatCurrency(trackRevenue)}
                          </p>
                          <p className="text-green-300/60 text-[10px]">
                            Revenu
                          </p>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg px-2 py-1.5 text-center border border-blue-500/20">
                          <p className="text-blue-400 font-bold text-sm">
                            {trackDownloads}
                          </p>
                          <p className="text-blue-300/60 text-[10px]">
                            Téléchargements
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <Badge
                        className={getStatusColor(
                          (track as any).status || "published",
                        )}
                      >
                        {(track as any).status || "published"}
                      </Badge>
                      <div className="text-right">
                        <p className="text-white font-medium">
                          {formatNumber(
                            (track as any).streams || track.playCount || 0,
                          )}
                        </p>
                        <p className="text-purple-200 text-xs">écoutes</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-purple-200">
                      <div className="text-center">
                        <p className="font-medium text-white">
                          {(track as any).bpm || "—"}
                        </p>
                        <p>BPM</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-white">
                          {(track as any).musicalKey ||
                            (track as any).key ||
                            "—"}
                        </p>
                        <p>Tonalité</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-white">
                          {(track as any).genre || "N/A"}
                        </p>
                        <p>Genre</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTracks.map((track) => {
            const artist = displayArtists.find((a) => a.id === track.artistId);
            const hasAudio =
              !!(track as any).hasAudio || !!(track as any).file_path;
            const trackRevenue = parseFloat((track as any).revenue || "0");
            const trackDownloads = (track as any).downloads || 0;
            const trackPrice = (track as any).price || "0.99";
            return (
              <div
                key={track.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${hasAudio ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-purple-500 to-pink-500"}`}
                    >
                      <Music2 className="h-6 w-6 text-white" />
                    </div>
                    {hasAudio && (
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity"
                      >
                        <Play className="h-4 w-4 text-white" />
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {track.title}
                      {hasAudio && (
                        <span className="ml-2 text-[10px] text-green-400">
                          ♦ AUDIO
                        </span>
                      )}
                    </p>
                    <p className="text-purple-200 text-sm">
                      {artist?.name || "Inconnu"} •{" "}
                      {(track as any).genre || "Inconnu"} •{" "}
                      {(track as any).bpm || "—"} BPM •{" "}
                      {(track as any).musicalKey || (track as any).key || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  {hasAudio && (
                    <div className="text-right hidden lg:block">
                      <p className="text-green-400 font-medium">
                        ${trackPrice}
                      </p>
                      <p className="text-green-300/50 text-xs">prix</p>
                    </div>
                  )}
                  {hasAudio && (
                    <div className="text-right hidden md:block">
                      <p className="text-blue-400 font-medium">
                        {trackDownloads}
                      </p>
                      <p className="text-blue-300/50 text-xs">
                        téléchargements
                      </p>
                    </div>
                  )}
                  <div className="text-right hidden md:block">
                    <p className="text-green-400">
                      {formatCurrency(trackRevenue)}
                    </p>
                    <p className="text-purple-200 text-sm">revenu</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">
                      {formatNumber(
                        (track as any).streams || track.playCount || 0,
                      )}
                    </p>
                    <p className="text-purple-200 text-sm">écoutes</p>
                  </div>
                  <Badge
                    className={getStatusColor(
                      (track as any).status || "published",
                    )}
                  >
                    {(track as any).status || "published"}
                  </Badge>
                  {hasAudio && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      onClick={() =>
                        window.open(
                          `/api/music/tracks/${track.id}/download`,
                          "_blank",
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-purple-200 hover:text-white hover:bg-white/10"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-gray-900 border-white/20"
                    >
                      {hasAudio && (
                        <DropdownMenuItem
                          className="text-white"
                          onClick={() => handlePlayTrack(track)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Lire
                        </DropdownMenuItem>
                      )}
                      {hasAudio && (
                        <DropdownMenuItem
                          className="text-white"
                          onClick={() =>
                            window.open(
                              `/api/music/tracks/${track.id}/download`,
                              "_blank",
                            )
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-white">
                        <Share2 className="mr-2 h-4 w-4" />
                        Partager
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/20" />
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={() => handleDeleteTrack(Number(track.id))}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Earnings Summary Card ── */}
      {earnings?.summary && (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Résumé des revenus musicaux
              </h3>
              <Badge className="bg-green-500/20 text-green-400">
                {earnings.summary.total_tracks} titres téléversés
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <p className="text-2xl font-bold text-green-400">
                  $
                  {parseFloat(earnings.summary.total_revenue || "0").toFixed(2)}
                </p>
                <p className="text-green-300/60 text-xs mt-1">Revenu total</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <p className="text-2xl font-bold text-blue-400">
                  {earnings.summary.total_downloads}
                </p>
                <p className="text-blue-300/60 text-xs mt-1">
                  Téléchargements totaux
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <p className="text-2xl font-bold text-purple-400">
                  {formatNumber(earnings.summary.total_streams)}
                </p>
                <p className="text-purple-300/60 text-xs mt-1">
                  Écoutes totales
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <p className="text-2xl font-bold text-amber-400">
                  $
                  {parseFloat(
                    earnings.summary.revenue_this_month || "0",
                  ).toFixed(2)}
                </p>
                <p className="text-amber-300/60 text-xs mt-1">Ce mois-ci</p>
              </div>
            </div>
            <p className="text-white/30 text-[10px] mt-3 text-center">
              💳 Les revenus sont reflétés dans votre Coffre-fort • Les revenus
              se mettent à jour à chaque téléchargement
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analyses avancées</h2>
          <p className="text-purple-200">
            Aperçus détaillés de la performance de votre musique
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Calendar className="mr-2 h-4 w-4" />
            30 derniers jours
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Download className="mr-2 h-4 w-4" />
            Exporter les données
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Geographic Distribution */}
        <Card className="lg:col-span-2 bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">
              Répartition géographique
            </CardTitle>
            <CardDescription className="text-purple-200">
              Principaux pays par écoutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-purple-200 text-xs sm:text-sm">
                      Pays
                    </TableHead>
                    <TableHead className="text-purple-200 text-xs sm:text-sm">
                      Écoutes
                    </TableHead>
                    <TableHead className="text-purple-200 text-xs sm:text-sm hidden sm:table-cell">
                      Pourcentage
                    </TableHead>
                    <TableHead className="text-purple-200 text-xs sm:text-sm hidden md:table-cell">
                      Croissance
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((displayAnalytics as any)?.topCountries || []).map(
                    (country: any, i: number) => (
                      <TableRow key={i} className="border-white/10">
                        <TableCell className="font-medium text-white text-xs sm:text-sm">
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-purple-400 hidden sm:block" />
                            <span>{country.country}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-white text-xs sm:text-sm">
                          {formatNumber(country.streams)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center">
                            <div className="w-24 bg-white/20 rounded-full h-2 mr-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                                style={{
                                  width: `${
                                    (country.streams /
                                      (((displayAnalytics as any)
                                        ?.topCountries || [])[0]?.streams ||
                                        1)) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-purple-200 text-sm">
                              {((country.streams / totalStreams) * 100).toFixed(
                                1,
                              )}
                              %
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-white/40 text-sm">—</div>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Audience Insights */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Aperçu du catalogue</CardTitle>
            <CardDescription className="text-purple-200">
              Détail de votre catalogue musical
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white text-sm">Total des titres</span>
                <span className="text-purple-200 text-sm">{totalTracks}</span>
              </div>
              <Progress
                value={Math.min(totalTracks * 10, 100)}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white text-sm">Total des artistes</span>
                <span className="text-purple-200 text-sm">{totalArtists}</span>
              </div>
              <Progress
                value={Math.min(totalArtists * 20, 100)}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white text-sm">Écoutes totales</span>
                <span className="text-purple-200 text-sm">
                  {formatNumber(lifetimeStreams)}
                </span>
              </div>
              <Progress
                value={Math.min(lifetimeStreams / 100, 100)}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white text-sm">Revenu total</span>
                <span className="text-purple-200 text-sm">
                  {formatCurrency(totalRevenue)}
                </span>
              </div>
              <Progress
                value={Math.min(totalRevenue / 10, 100)}
                className="h-2"
              />
            </div>
            <Separator className="bg-white/20" />
            <div className="pt-2">
              <p className="text-purple-200 text-sm mb-2">Genres populaires</p>
              <div className="space-y-2">
                {((displayAnalytics as any)?.platformDistribution || [])
                  .length === 0 ? (
                  <p className="text-white/30 text-sm">
                    Aucune donnée de genre pour le moment
                  </p>
                ) : (
                  ((displayAnalytics as any)?.platformDistribution || []).map(
                    (g: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-white text-sm">{g.platform}</span>
                        <span className="text-purple-200 text-sm">
                          {g.percentage}%
                        </span>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance */}
      <Card className="bg-white/5 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Performance par genre</CardTitle>
          <CardDescription className="text-purple-200">
            Répartition des revenus par genre
          </CardDescription>
        </CardHeader>
        <CardContent>
          {((displayAnalytics as any)?.platformDistribution || []).length ===
          0 ? (
            <div className="flex items-center justify-center py-12 text-white/30">
              <div className="text-center">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Téléversez des titres pour voir la performance par genre</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {((displayAnalytics as any)?.platformDistribution || []).map(
                (platform: any, i: number) => {
                  const colors = [
                    "from-purple-500 to-pink-500",
                    "from-blue-500 to-cyan-500",
                    "from-green-500 to-emerald-500",
                    "from-yellow-500 to-orange-500",
                    "from-red-500 to-rose-500",
                  ];
                  return (
                    <div key={i} className="text-center">
                      <div className="relative h-32 w-32 mx-auto mb-4">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className={`h-24 w-24 rounded-full bg-gradient-to-br ${colors[i]} opacity-20`}
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-white">
                              {platform.percentage}%
                            </p>
                            <p className="text-sm text-purple-200">part</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-white font-medium">
                        {platform.platform}
                      </p>
                      <p className="text-purple-200 text-sm">
                        {formatCurrency(
                          totalRevenue * (platform.percentage / 100),
                        )}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderRoyalties = () => {
    const profile = artistStats?.profile;
    const badge = artistStats?.badge;
    const thisWeek = artistStats?.thisWeek;
    const earningsHistory = artistStats?.earningsHistory || [];
    const walletBalance = profile?.walletBalance || 0;
    const pool = poolData?.pool;
    const payouts = payoutHistoryData?.payouts || [];
    const BADGE_TIERS = artistStats?.allBadgeTiers || [];
    const contract = contractData?.contract;
    const gradeInfo: Record<
      string,
      { label: string; share: number; color: string; perStream: string }
    > = {
      S: {
        label: "S — Elite",
        share: 85,
        color: "#FFD700",
        perStream: "$0.0085",
      },
      A: {
        label: "A — Premier",
        share: 75,
        color: "#C0C0C0",
        perStream: "$0.0075",
      },
      B: {
        label: "B — Standard",
        share: 65,
        color: "#CD7F32",
        perStream: "$0.0065",
      },
      C: {
        label: "C — Entry",
        share: 55,
        color: "#9CA3AF",
        perStream: "$0.0055",
      },
    };
    const currentGrade = contract?.grade ? gradeInfo[contract.grade] : null;

    return (
      <div className="space-y-6">
        {/* Informative Welcome Panel */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10 border border-purple-500/20 rounded-2xl p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-white font-bold text-lg">
                Comment vous gagnez des redevances
              </h3>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">1</span>
                  </div>
                  <p className="text-white/50">
                    <span className="text-white font-medium">
                      Les auditeurs écoutent votre musique
                    </span>{" "}
                    — chaque lecture ≥30 secondes compte comme une écoute valide
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-400 text-xs font-bold">2</span>
                  </div>
                  <p className="text-white/50">
                    <span className="text-white font-medium">
                      Le fonds hebdomadaire se remplit
                    </span>{" "}
                    — les abonnements des auditeurs alimentent le fonds de
                    redevances chaque semaine
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-400 text-xs font-bold">3</span>
                  </div>
                  <p className="text-white/50">
                    <span className="text-white font-medium">
                      Vous êtes payé
                    </span>{" "}
                    — chaque lundi, 90 % du fonds est distribué aux artistes
                    selon leur performance
                  </p>
                </div>
              </div>
              {currentGrade && (
                <div className="flex items-center gap-3 pt-1">
                  <Badge
                    className="text-xs font-bold"
                    style={{
                      backgroundColor: currentGrade.color + "20",
                      color: currentGrade.color,
                    }}
                  >
                    Grade {currentGrade.label}
                  </Badge>
                  <span className="text-white/40 text-xs">
                    {currentGrade.share}% part artiste •{" "}
                    {currentGrade.perStream}/écoute
                  </span>
                </div>
              )}
              {!contract && (
                <p className="text-amber-400/70 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Aucun contrat actif —{" "}
                  <a
                    href="/artist-portal-welcome"
                    className="underline hover:text-amber-300"
                  >
                    postulez maintenant
                  </a>{" "}
                  pour des tarifs par écoute plus élevés et des privilèges de
                  mise en avant
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:text-white hover:bg-white/10 flex-shrink-0"
              onClick={() => setShowInfoWindow(true)}
            >
              <HelpCircle className="mr-1 h-4 w-4" />
              Guide complet
            </Button>
          </div>
        </motion.div>

        {/* Contract Grade Strip */}
        {contract && currentGrade && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: currentGrade.color + "20" }}
              >
                <FileText
                  className="w-5 h-5"
                  style={{ color: currentGrade.color }}
                />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  Contrat Verso Air
                </p>
                <p className="text-white/30 text-xs">
                  Grade {contract.grade} • Actif
                </p>
              </div>
            </div>
            <Separator
              orientation="vertical"
              className="h-8 bg-white/10 hidden sm:block"
            />
            <div className="text-center px-3">
              <p className="text-white font-bold">{currentGrade.share}%</p>
              <p className="text-white/30 text-[10px]">Votre part</p>
            </div>
            <div className="text-center px-3">
              <p className="text-white font-bold">{currentGrade.perStream}</p>
              <p className="text-white/30 text-[10px]">Par écoute</p>
            </div>
            {contract.canBeFeatured && (
              <Badge className="bg-amber-500/20 text-amber-300 text-xs">
                <Star className="w-3 h-3 mr-1" />
                Éligible à la mise en avant
              </Badge>
            )}
            {contract.hdAudioAccess && (
              <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                <Volume2 className="w-3 h-3 mr-1" />
                Audio HD
              </Badge>
            )}
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              StreamRoyale — Redevances & Revenus
            </h2>
            <p className="text-purple-200">
              Données de compétition en direct • Distribution hebdomadaire
              chaque lundi à 06:00 UTC
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => setShowInfoWindow(true)}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Comment ça marche
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => {
                if (walletBalance < 10) return;
                payoutMutation.mutate({
                  amount: parseFloat(payoutAmount) || walletBalance,
                  method: "paypal",
                });
              }}
              disabled={walletBalance < 10 || payoutMutation.isPending}
            >
              <Wallet className="mr-2 h-4 w-4" />
              {payoutMutation.isPending
                ? "Traitement..."
                : "Demander un versement"}
            </Button>
          </div>
        </div>

        {/* Badge & Rank Strip */}
        {badge && (
          <div className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/20 rounded-2xl p-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {["🌱", "🥉", "🥈", "🥇", "💎", "👑", "⚡"][badge.tier - 1] ||
                  "🌱"}
              </div>
              <div>
                <p className="text-white font-bold">{badge.name}</p>
                <p className="text-white/40 text-xs">Tier {badge.tier}</p>
              </div>
            </div>
            {badge.revenueBoost > 0 && (
              <div className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-bold rounded-full">
                +{badge.revenueBoost}% Boost de revenu
              </div>
            )}
            {badge.nextTier && (
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Progression vers {badge.nextTier.name}</span>
                  <span>{badge.nextTier.progress.toFixed(1)}%</span>
                </div>
                <Progress value={badge.nextTier.progress} className="h-2" />
                <p className="text-white/20 text-[10px] mt-1">
                  {(profile?.lifetimeStreams || 0).toLocaleString()} /{" "}
                  {badge.nextTier.threshold.toLocaleString()} écoutes
                </p>
              </div>
            )}
            {thisWeek && thisWeek.rank > 0 && (
              <div className="text-right">
                <p className="text-white font-bold text-lg">#{thisWeek.rank}</p>
                <p className="text-white/40 text-xs">
                  of {thisWeek.totalArtists} cette semaine
                </p>
              </div>
            )}
          </div>
        )}

        {/* Balance & Pool Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardContent className="p-5 text-center">
              <p className="text-purple-200 text-sm mb-1">
                Solde du portefeuille
              </p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(walletBalance)}
              </p>
              {walletBalance < 10 && (
                <p className="text-yellow-400 text-xs mt-1">
                  Min. 10 $ pour retirer
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardContent className="p-5 text-center">
              <p className="text-purple-200 text-sm mb-1">Cette semaine</p>
              <p className="text-3xl font-bold text-white">
                {(thisWeek?.streams || 0).toLocaleString()}
              </p>
              <p className="text-white/40 text-xs mt-1">écoutes valides</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardContent className="p-5 text-center">
              <p className="text-purple-200 text-sm mb-1">Écoutes totales</p>
              <p className="text-3xl font-bold text-white">
                {(profile?.lifetimeStreams || 0).toLocaleString()}
              </p>
              <p className="text-white/40 text-xs mt-1">
                {profile?.leagueName || "—"} ligue
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardContent className="p-5 text-center">
              <p className="text-purple-200 text-sm mb-1">Fonds hebdomadaire</p>
              <p className="text-3xl font-bold text-green-400">
                {formatCurrency(pool?.totalPool || 0)}
              </p>
              <p className="text-white/40 text-xs mt-1">
                {(pool?.totalStreams || 0).toLocaleString()} écoutes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings History Table */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Historique des revenus</CardTitle>
            <CardDescription className="text-purple-200">
              Distributions hebdomadaires de redevances de StreamRoyale
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earningsHistory.length === 0 ? (
              <div className="text-center py-10 text-white/30">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-white/50 font-medium mb-1">
                  Aucune distribution de redevances pour le moment
                </p>
                <p className="text-white/30 text-sm max-w-md mx-auto">
                  Lorsque les auditeurs écoutent vos titres, vous gagnez du
                  fonds de redevances hebdomadaire. Les distributions ont lieu
                  chaque lundi à 06:00 UTC — vos revenus apparaîtront ici.
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white/50 hover:text-white hover:bg-white/10"
                    onClick={() => setShowInfoWindow(true)}
                  >
                    <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
                    Comment ça marche
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white/50 hover:text-white hover:bg-white/10"
                    onClick={() => setActiveTab("music")}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Téléverser de la musique
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-purple-200 text-xs sm:text-sm">
                        Semaine
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm hidden sm:table-cell">
                        Écoutes
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm hidden md:table-cell">
                        Garanti
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm hidden md:table-cell">
                        Performance
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm">
                        Total
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm hidden sm:table-cell">
                        Rang
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm hidden lg:table-cell">
                        Part du fonds
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earningsHistory.map((entry: any, idx: number) => (
                      <TableRow key={idx} className="border-white/10">
                        <TableCell className="font-medium text-white text-xs sm:text-sm">
                          W{entry.weekNumber} / {entry.yearNumber}
                        </TableCell>
                        <TableCell className="text-white text-xs sm:text-sm hidden sm:table-cell">
                          {entry.streamCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-green-400 text-xs sm:text-sm hidden md:table-cell">
                          {formatCurrency(entry.guaranteedAmount)}
                        </TableCell>
                        <TableCell className="text-purple-400 text-xs sm:text-sm hidden md:table-cell">
                          {formatCurrency(entry.performanceAmount)}
                        </TableCell>
                        <TableCell className="text-white font-bold text-xs sm:text-sm">
                          {formatCurrency(entry.totalEarnings)}
                        </TableCell>
                        <TableCell className="text-white text-xs sm:text-sm hidden sm:table-cell">
                          #{entry.globalRank || "—"}
                        </TableCell>
                        <TableCell className="text-white/60 text-xs sm:text-sm hidden lg:table-cell">
                          {entry.poolSharePercent?.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        {payouts.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">
                Demandes de versement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-purple-200 text-xs sm:text-sm">
                        Date
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm">
                        Montant
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm hidden sm:table-cell">
                        Méthode
                      </TableHead>
                      <TableHead className="text-purple-200 text-xs sm:text-sm">
                        Statut
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p: any) => (
                      <TableRow key={p.id} className="border-white/10">
                        <TableCell className="text-white text-xs sm:text-sm">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-white font-medium text-xs sm:text-sm">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell className="text-white/60 text-xs sm:text-sm hidden sm:table-cell">
                          {p.method}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${
                              p.status === "completed"
                                ? "bg-green-500/20 text-green-400"
                                : p.status === "rejected"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <StreamRoyaleInfoWindow
          isOpen={showInfoWindow}
          onClose={() => setShowInfoWindow(false)}
        />
      </div>
    );
  };

  const renderCollaborations = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Collaborations</h2>
          <p className="text-purple-200">
            Connectez-vous et créez avec d'autres artistes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Users2 className="mr-2 h-4 w-4" />
            Trouver des artistes
          </Button>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle collaboration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Collaborations */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Collaborations actives</CardTitle>
            <CardDescription className="text-purple-200">
              Projets en cours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayCollaborations.filter((c) => c.status === "active")
                .length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <Users2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    Aucune collaboration active pour le moment
                  </p>
                  <p className="text-xs mt-1 text-white/20">
                    Utilisez « Trouver des artistes » pour vous connecter avec
                    d'autres créateurs
                  </p>
                </div>
              ) : (
                displayCollaborations
                  .filter((c) => c.status === "active")
                  .map((collab) => (
                    <div
                      key={collab.id}
                      className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                {collab.artist.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-white font-medium">
                              {collab.artist}
                            </p>
                            <Badge className="bg-green-500/20 text-green-400">
                              Actif
                            </Badge>
                          </div>
                          <p className="text-purple-200 text-sm mb-2">
                            Titre : {collab.track}
                          </p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-white">
                              Partage de revenus :{" "}
                              <span className="font-medium">
                                {collab.revenueShare}%
                              </span>
                            </span>
                            <span className="text-purple-200">
                              Commencée le : {collab.date}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-purple-200 hover:text-white hover:bg-white/10"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Collaboration Requests */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Demandes en attente</CardTitle>
            <CardDescription className="text-purple-200">
              Invitations de collaboration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayCollaborations.filter((c) => c.status === "pending")
                .length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucune demande en attente</p>
                  <p className="text-xs mt-1 text-white/20">
                    Les invitations d'autres artistes apparaîtront ici
                  </p>
                </div>
              ) : (
                displayCollaborations
                  .filter((c) => c.status === "pending")
                  .map((collab) => (
                    <div
                      key={collab.id}
                      className="p-4 rounded-lg bg-white/5 border border-yellow-500/20"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
                                {collab.artist.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-white font-medium">
                              {collab.artist}
                            </p>
                          </div>
                          <p className="text-purple-200 text-sm">
                            Souhaite collaborer sur : {collab.track}
                          </p>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-400">
                          En attente
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                        >
                          <Check className="mr-2 h-3 w-3" />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-400 text-red-400 hover:bg-red-400/10"
                        >
                          <X className="mr-2 h-3 w-3" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <motion.div
      className="flex flex-col min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
      initial={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
      animate={
        portalRevealed
          ? { opacity: 1, scale: 1, filter: "blur(0px)" }
          : { opacity: 0, scale: 1.02, filter: "blur(8px)" }
      }
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Hidden audio element — drives all playback */}
      <audio ref={audioRef} preload="auto" crossOrigin="use-credentials" />

      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/20 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Music2 className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-purple-200 text-sm truncate">
                    {displayArtists.find((a) => a.id === currentTrack.artistId)
                      ?.name || "Unknown Artist"}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-purple-200 hover:text-white hover:bg-white/10 flex-shrink-0"
                  onClick={handleTogglePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden md:block">
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-200 text-sm tabular-nums">
                      {Math.floor(audioCurrentTime / 60)}:
                      {String(Math.floor(audioCurrentTime % 60)).padStart(
                        2,
                        "0",
                      )}
                    </span>
                    <Slider
                      value={[audioProgress]}
                      onValueChange={handleSeek}
                      max={100}
                      step={0.1}
                      className="w-64"
                    />
                    <span className="text-purple-200 text-sm tabular-nums">
                      {Math.floor(audioDuration / 60)}:
                      {String(Math.floor(audioDuration % 60)).padStart(2, "0")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-purple-200 hover:text-white hover:bg-white/10"
                    onClick={() => handleSkipTrack("prev")}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="bg-white/10 text-white hover:bg-white/20"
                    onClick={handleTogglePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-purple-200 hover:text-white hover:bg-white/10"
                    onClick={() => handleSkipTrack("next")}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="hidden sm:flex items-center space-x-2">
                  <Volume1 className="h-4 w-4 text-purple-200" />
                  <Slider
                    value={volume}
                    onValueChange={setVolume}
                    max={100}
                    step={1}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Artist Portal Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-8 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Music className="h-8 w-8 text-white" />
              <div>
                <span className="text-xl font-bold text-white">
                  Verso Air ™️ Portail Artiste
                </span>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    {connectedUser.tier}
                  </Badge>
                  <span className="text-purple-200 text-sm">
                    Bon retour, {connectedUser.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-purple-200"
                  >
                    <Bell className="h-5 w-5" />
                    {notifications.filter((n) => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 bg-gray-900 border-white/20"
                >
                  <DropdownMenuLabel className="text-white">
                    Notifications
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/20" />
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`py-3 ${
                        notification.read ? "" : "bg-white/5"
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">
                            {notification.title}
                          </span>
                          <span className="text-purple-200 text-xs">
                            {notification.time}
                          </span>
                        </div>
                        <span className="text-purple-200 text-sm">
                          {notification.description}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-purple-200 hover:text-white hover:bg-white/10"
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src="/api/placeholder/32/32" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {connectedUser.initials}
                      </AvatarFallback>
                    </Avatar>
                    {connectedUser.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-gray-900 border-white/20"
                >
                  <DropdownMenuLabel className="text-white">
                    Mon compte
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem className="text-white">
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Facturation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem className="text-white">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Assistance
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 overflow-x-auto -mx-4 px-4 scrollbar-hide">
            <Tabs
              defaultValue="dashboard"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="bg-white/10 backdrop-blur-md border border-white/20 w-max min-w-full flex">
                <TabsTrigger
                  value="dashboard"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap"
                >
                  <LayoutDashboard className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Tableau de bord
                </TabsTrigger>
                <TabsTrigger
                  value="music"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap"
                >
                  <Music2 className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Musique
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap"
                >
                  <BarChart3 className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Analyses
                </TabsTrigger>
                <TabsTrigger
                  value="royalties"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap"
                >
                  <DollarSign className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Redevances
                </TabsTrigger>
                <TabsTrigger
                  value="leaderboard"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap"
                >
                  <Trophy className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Classement
                </TabsTrigger>
                <TabsTrigger
                  value="collaborations"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap"
                >
                  <Users2 className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Collabs
                </TabsTrigger>
                <TabsTrigger
                  value="releases"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap"
                >
                  <Calendar className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Sorties
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 pb-24">
        {loadingArtists || loadingTracks || loadingAnalytics ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">
                Chargement des données artiste...
              </p>
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsContent value="dashboard" className="space-y-6">
              {renderDashboard()}
            </TabsContent>

            <TabsContent value="music" className="space-y-6">
              {renderMusic()}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {renderAnalytics()}
            </TabsContent>

            <TabsContent value="royalties" className="space-y-6">
              {renderRoyalties()}
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      🏆 Classement StreamRoyale
                    </h2>
                    <p className="text-purple-200">
                      Week {leaderboardData?.weekNumber || "—"} • Classements de
                      la compétition mondiale
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={leaderboardFilter.league}
                      onValueChange={(v) =>
                        setLeaderboardFilter((f) => ({
                          ...f,
                          league: v,
                          page: 1,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[160px] bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Toutes les ligues" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les ligues</SelectItem>
                        {(leaderboardData?.leagues || []).map((l: any) => (
                          <SelectItem key={l.id} value={String(l.id)}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Pool stats bar */}
                {poolData?.pool && (
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-4 flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-white/40 text-xs">
                        Fonds hebdomadaire
                      </p>
                      <p className="text-green-400 text-xl font-bold">
                        {formatCurrency(poolData.pool.totalPool)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Écoutes totales</p>
                      <p className="text-white text-xl font-bold">
                        {(poolData.pool.totalStreams || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">
                        Artistes qualifiés
                      </p>
                      <p className="text-white text-xl font-bold">
                        {poolData.pool.qualifyingArtists}
                      </p>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-white/20 text-xs">
                        {poolData.splitRules?.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Leaderboard table */}
                <Card className="bg-white/5 backdrop-blur-md border-white/20">
                  <CardContent className="p-0">
                    {!leaderboardData?.leaderboard?.length ? (
                      <div className="text-center py-12 text-white/30">
                        <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>
                          Aucun classement cette semaine. Commencez à écouter !
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/20">
                              <TableHead className="text-purple-200 w-12 sm:w-16 text-xs sm:text-sm">
                                #
                              </TableHead>
                              <TableHead className="text-purple-200 text-xs sm:text-sm">
                                Artiste
                              </TableHead>
                              <TableHead className="text-purple-200 text-xs sm:text-sm hidden sm:table-cell">
                                Badge
                              </TableHead>
                              <TableHead className="text-purple-200 text-xs sm:text-sm hidden md:table-cell">
                                Ligue
                              </TableHead>
                              <TableHead className="text-purple-200 text-right text-xs sm:text-sm">
                                Hebdo
                              </TableHead>
                              <TableHead className="text-purple-200 text-right text-xs sm:text-sm hidden sm:table-cell">
                                Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaderboardData.leaderboard.map((artist: any) => (
                              <TableRow
                                key={artist.artistId}
                                className={`border-white/10 ${artist.rank <= 3 ? "bg-yellow-500/5" : ""}`}
                              >
                                <TableCell className="font-bold text-white text-sm sm:text-lg">
                                  {artist.rank <= 3
                                    ? ["🥇", "🥈", "🥉"][artist.rank - 1]
                                    : `#${artist.rank}`}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">
                                      {artist.stageName?.charAt(0) || "?"}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-white font-medium text-xs sm:text-sm truncate">
                                        {artist.stageName}
                                      </p>
                                      <p className="text-white/30 text-[10px] sm:text-xs truncate">
                                        {artist.country}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <span className="text-xs sm:text-sm">
                                    {artist.badgeName}
                                  </span>
                                </TableCell>
                                <TableCell className="text-white/60 text-xs sm:text-sm hidden md:table-cell">
                                  {artist.leagueName || "—"}
                                </TableCell>
                                <TableCell className="text-right text-white font-medium text-xs sm:text-sm">
                                  {artist.weeklyStreams.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-white/40 text-xs sm:text-sm hidden sm:table-cell">
                                  {artist.lifetimeStreams.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pagination */}
                {leaderboardData?.pagination &&
                  leaderboardData.pagination.pages > 1 && (
                    <div className="flex justify-center gap-2">
                      {Array.from({
                        length: Math.min(5, leaderboardData.pagination.pages),
                      }).map((_, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant={
                            leaderboardFilter.page === i + 1
                              ? "default"
                              : "outline"
                          }
                          className={
                            leaderboardFilter.page === i + 1
                              ? "bg-purple-600"
                              : "border-white/20 text-white"
                          }
                          onClick={() =>
                            setLeaderboardFilter((f) => ({ ...f, page: i + 1 }))
                          }
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
              </div>
            </TabsContent>

            <TabsContent value="collaborations" className="space-y-6">
              {renderCollaborations()}
            </TabsContent>

            <TabsContent value="releases" className="space-y-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Calendrier des sorties
                    </h2>
                    <p className="text-purple-200">
                      Planifiez et gérez vos prochaines sorties
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowScheduleModal(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Planifier une sortie
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Upcoming Releases */}
                  <Card className="lg:col-span-2 bg-white/5 backdrop-blur-md border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Prochaines sorties
                      </CardTitle>
                      <CardDescription className="text-purple-200">
                        Sorties planifiées et brouillons
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {displayReleases.map((release) => (
                          <div
                            key={release.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div
                                className={`p-3 rounded-lg ${
                                  release.type === "album"
                                    ? "bg-purple-500/20"
                                    : release.type === "ep"
                                      ? "bg-pink-500/20"
                                      : "bg-blue-500/20"
                                }`}
                              >
                                {release.type === "album" ? (
                                  <Album className="h-6 w-6 text-purple-400" />
                                ) : release.type === "ep" ? (
                                  <Disc className="h-6 w-6 text-pink-400" />
                                ) : (
                                  <Music2 className="h-6 w-6 text-blue-400" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="text-white font-medium">
                                    {release.title}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={
                                      release.type === "album"
                                        ? "border-purple-400 text-purple-400"
                                        : release.type === "ep"
                                          ? "border-pink-400 text-pink-400"
                                          : "border-blue-400 text-blue-400"
                                    }
                                  >
                                    {release.type.toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-purple-200 text-sm">
                                  Sortie : {release.releaseDate} • Statut :{" "}
                                  {release.status}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-medium">
                                {formatNumber(release.streams)}
                              </p>
                              <p className="text-purple-200 text-sm">écoutes</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Release Calendar */}
                  <Card className="bg-white/5 backdrop-blur-md border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Calendrier des sorties
                      </CardTitle>
                      <CardDescription className="text-purple-200">
                        Dates des prochaines sorties
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border-white/20 bg-transparent"
                      />
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-white text-sm">
                              Sorties d'albums
                            </span>
                          </div>
                          <span className="text-purple-200 text-sm">
                            {
                              displayReleases.filter((r) => r.type === "album")
                                .length
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-pink-500" />
                            <span className="text-white text-sm">
                              Sorties d'EP
                            </span>
                          </div>
                          <span className="text-purple-200 text-sm">
                            {
                              displayReleases.filter((r) => r.type === "ep")
                                .length
                            }
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-white text-sm">
                              Sorties de singles
                            </span>
                          </div>
                          <span className="text-purple-200 text-sm">
                            {
                              displayReleases.filter((r) => r.type === "single")
                                .length
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog
        open={showUploadModal}
        onOpenChange={(open) => {
          if (!isUploading) setShowUploadModal(open);
        }}
      >
        <DialogContent className="sm:max-w-[540px] bg-gray-900 border-white/20 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Téléverser un nouveau titre</DialogTitle>
            <DialogDescription className="text-purple-200">
              Téléversez votre musique — fixez un prix et commencez à gagner par
              téléchargement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Track Title */}
            <div className="space-y-2">
              <Label htmlFor="track-title">Titre du morceau *</Label>
              <Input
                id="track-title"
                placeholder="Entrez le titre du morceau"
                className="bg-white/10 border-white/30"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            {/* Genre + Price row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select
                  value={uploadForm.genre}
                  onValueChange={(v) =>
                    setUploadForm((prev) => ({ ...prev, genre: v }))
                  }
                >
                  <SelectTrigger className="bg-white/10 border-white/30">
                    <SelectValue placeholder="Sélectionner le genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="Afrobeats">Afrobeats</SelectItem>
                    <SelectItem value="R&B">R&B</SelectItem>
                    <SelectItem value="Hip Hop">Hip Hop</SelectItem>
                    <SelectItem value="Pop">Pop</SelectItem>
                    <SelectItem value="Jazz">Jazz</SelectItem>
                    <SelectItem value="Soul">Soul</SelectItem>
                    <SelectItem value="Reggae">Reggae</SelectItem>
                    <SelectItem value="Electronic">Électronique</SelectItem>
                    <SelectItem value="Rock">Rock</SelectItem>
                    <SelectItem value="Classical">Classique</SelectItem>
                    <SelectItem value="Gospel">Gospel</SelectItem>
                    <SelectItem value="Latin">Latin</SelectItem>
                    <SelectItem value="Dancehall">Dancehall</SelectItem>
                    <SelectItem value="Other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prix par téléchargement ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.99"
                  className="bg-white/10 border-white/30"
                  value={uploadForm.price}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* BPM / Key / Mood row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>BPM</Label>
                <Input
                  type="number"
                  placeholder="120"
                  className="bg-white/10 border-white/30"
                  value={uploadForm.bpm}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, bpm: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tonalité</Label>
                <Input
                  placeholder="C minor"
                  className="bg-white/10 border-white/30"
                  value={uploadForm.musicalKey}
                  onChange={(e) =>
                    setUploadForm((prev) => ({
                      ...prev,
                      musicalKey: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Ambiance</Label>
                <Input
                  placeholder="Chill"
                  className="bg-white/10 border-white/30"
                  value={uploadForm.mood}
                  onChange={(e) =>
                    setUploadForm((prev) => ({ ...prev, mood: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* File upload zone */}
            <div className="space-y-2">
              <Label>Fichier audio *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.flac,.aiff,.ogg,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/flac,audio/aiff,audio/x-aiff,audio/ogg,audio/mp4,audio/x-m4a"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setUploadFile(f);
                }}
              />
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  uploadFile
                    ? "border-green-400/50 bg-green-500/10"
                    : "border-white/30 hover:border-purple-400/50 hover:bg-white/5"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setUploadFile(f);
                }}
              >
                {uploadFile ? (
                  <div className="space-y-2">
                    <FileMusic className="h-10 w-10 text-green-400 mx-auto" />
                    <p className="text-green-300 font-medium">
                      {uploadFile.name}
                    </p>
                    <p className="text-green-200/60 text-sm">
                      {(uploadFile.size / 1024 / 1024).toFixed(1)} MB •{" "}
                      {uploadFile.type || "audio"}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-10 w-10 text-purple-400 mx-auto mb-3" />
                    <p className="text-white mb-1">
                      Déposez votre fichier audio ici ou cliquez pour parcourir
                    </p>
                    <p className="text-purple-200 text-sm">
                      Formats : MP3, WAV, FLAC, AIFF, OGG • Max 100 Mo
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="upload-desc">Description</Label>
              <Textarea
                id="upload-desc"
                placeholder="Parlez-nous de ce titre..."
                className="bg-white/10 border-white/30 min-h-[80px]"
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-200">Téléversement...</span>
                  <span className="text-white font-medium">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setUploadFile(null);
                setUploadProgress(0);
              }}
              className="border-white/30 text-white hover:bg-white/10"
              disabled={isUploading}
            >
              Annuler
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={handleRealUpload}
              disabled={isUploading || !uploadFile || !uploadForm.title}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "Téléversement..." : "Téléverser le titre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Release Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-[500px] bg-gray-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Planifier une sortie</DialogTitle>
            <DialogDescription className="text-purple-200">
              Planifiez votre prochaine sortie sur toutes les plateformes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="release-type">Type de sortie</Label>
                <Select>
                  <SelectTrigger className="bg-white/10 border-white/30">
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="ep">EP</SelectItem>
                    <SelectItem value="album">Album</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="release-date">Date de sortie</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white/10 border-white/30 hover:bg-white/20",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? (
                        format(date, "PPP")
                      ) : (
                        <span>Choisir une date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-900 border-white/20">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="bg-gray-900"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="platforms">Plateformes</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Spotify",
                  "Apple Music",
                  "YouTube Music",
                  "SoundCloud",
                  "Deezer",
                  "Tidal",
                ].map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Switch id={platform} />
                    <Label htmlFor={platform} className="text-sm">
                      {platform}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing-budget">
                Budget marketing (optionnel)
              </Label>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-purple-200" />
                <Input
                  id="marketing-budget"
                  type="number"
                  placeholder="0.00"
                  className="bg-white/10 border-white/30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleModal(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Calendar className="mr-2 h-4 w-4" />
              Planifier la sortie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Helper components (you would need to create these in your components folder)
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Apple = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M14.94 5.19A4.38 4.38 0 0 0 16 2a4.44 4.44 0 0 0-3 1.52 4.17 4.17 0 0 0-1 3.09 3.69 3.69 0 0 0 2.94-1.42zm2.52 7.44a4.51 4.51 0 0 1 2.16-3.81 4.66 4.66 0 0 0-3.66-2c-1.56-.16-3 .91-3.83.91s-2-.89-3.3-.87a4.92 4.92 0 0 0-4.14 2.53C2.93 12.45 4.24 17 6 19.47c.8 1.21 1.8 2.58 3.12 2.53s1.75-.76 3.28-.76 2 .76 3.3.73 2.22-1.24 3.06-2.45a11 11 0 0 0 1.38-2.85 4.41 4.41 0 0 1-2.68-4.04z"
    />
  </svg>
);

// Music Platform SSO Icons
const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

const AppleMusicIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.99c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81.84-.553 1.472-1.287 1.88-2.208.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.785-.49-2.166-1.373-.253-.59-.254-1.2-.087-1.81.25-.914.9-1.483 1.778-1.806.3-.11.616-.173.928-.247.46-.11.92-.213 1.378-.335.2-.053.343-.186.37-.398.006-.04.015-.08.015-.122V7.833c0-.15-.06-.267-.202-.318-.117-.042-.24-.063-.36-.088L10.2 6.422c-.252-.052-.505-.104-.757-.156-.093-.02-.2-.003-.266.085-.058.078-.086.18-.086.282v8.318c0 .136-.004.274-.016.41-.073.83-.386 1.543-1.077 2.054-.467.344-1 .53-1.578.58-.562.05-1.114.012-1.638-.205-.618-.257-1.066-.665-1.323-1.28-.195-.466-.242-.952-.187-1.45.1-.882.535-1.574 1.317-2.03.376-.218.787-.356 1.217-.424.39-.062.787-.093 1.176-.16.295-.05.582-.12.835-.274.147-.09.255-.21.294-.385.009-.04.02-.08.02-.122V4.074c0-.072.002-.146.016-.217.038-.193.176-.313.362-.35.147-.03.298-.045.447-.065l3.426-.62c1.082-.193 2.164-.388 3.246-.583.226-.04.454-.082.682-.117.15-.022.28.053.333.185.025.063.042.13.042.197v6.59z" />
  </svg>
);

const AudiomackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.97 17.403c-.2.334-.534.534-.868.534-.2 0-.334-.067-.534-.134-1.134-.668-2.535-1.001-4.002-1.001-1.134 0-2.268.2-3.335.534-.134.067-.267.067-.4.067-.468 0-.868-.334-1.001-.801-.134-.468.133-.935.534-1.068 1.267-.401 2.668-.601 4.135-.601 1.668 0 3.335.4 4.802 1.134.467.201.668.735.468 1.135zm1.134-2.735c-.268.4-.668.601-1.068.601-.2 0-.4-.067-.6-.2-1.402-.868-3.336-1.335-5.203-1.335-1.267 0-2.535.2-3.669.601-.133.067-.267.067-.4.067-.534 0-1.001-.4-1.134-.934-.2-.534.066-1.135.533-1.335 1.401-.468 2.935-.735 4.602-.735 2.201 0 4.402.534 6.27 1.602.467.267.668.868.467 1.401zm1.268-3.135c-.267.467-.734.734-1.268.734-.2 0-.4-.067-.6-.134-1.735-1.001-4.136-1.601-6.537-1.601-1.468 0-2.935.2-4.269.601-.133.067-.333.067-.467.067-.6 0-1.134-.467-1.268-1.068-.2-.6.134-1.268.668-1.468 1.534-.534 3.268-.801 5.269-.801 2.802 0 5.604.668 7.806 1.868.534.267.801.935.534 1.535z" />
  </svg>
);

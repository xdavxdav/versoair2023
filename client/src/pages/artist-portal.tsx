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
  useMusicAlbums,
  createAlbum,
  useCollaborations,
  sendCollabRequest,
  updateCollabStatus,
  useArtistSearch,
} from "@/hooks/use-music";
import {
  checkAuth,
  login as authLogin,
  logout as authLogout,
} from "@/lib/auth";
import { useAudio } from "@/lib/audio-context";
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
import { useGTRetranslate } from "@/hooks/use-gt-retranslate";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRequirePortal } from "@/hooks/useRequirePortal";

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
  const globalAudio = useAudio();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdvancedUpload, setShowAdvancedUpload] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [collabSearch, setCollabSearch] = useState("");
  const [showCollabSearch, setShowCollabSearch] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [albumForm, setAlbumForm] = useState({
    title: "",
    genre: "",
    description: "",
    albumType: "album",
    trackIds: [] as number[],
  });
  const [albumCreating, setAlbumCreating] = useState(false);
  const [showCollabRequestModal, setShowCollabRequestModal] = useState(false);
  const [collabTargetArtist, setCollabTargetArtist] = useState<any>(null);
  const [collabForm, setCollabForm] = useState({
    trackTitle: "",
    revenueShare: 50,
    message: "",
    genre: "",
  });
  const [incognitoMode, setIncognitoMode] = useState(
    () => localStorage.getItem("artist_incognito") === "true",
  );
  const [notifications, setNotifications] = useState<
    {
      id: number;
      title: string;
      description: string;
      time: string;
      read: boolean;
    }[]
  >([]);

  // ── Audio player — delegate to global AudioProvider ──
  // Local aliases for the global player state
  const isPlaying = globalAudio.isPlaying;
  const currentTrack = globalAudio.currentTrack as Track | null;
  const audioProgress = globalAudio.progress * 100;
  const audioCurrentTime = globalAudio.currentTime;
  const audioDuration = globalAudio.duration;

  const { data: artists, isLoading: loadingArtists } = useMusicArtists();
  const { data: tracks, isLoading: loadingTracks } = useMusicTracks();
  const { data: analytics, isLoading: loadingAnalytics } = useMusicAnalytics();
  const { data: earnings } = useMusicEarnings();
  const invalidateTracks = useInvalidateTracks();
  const { data: myArtist } = useMyArtist();
  const { data: albumsData } = useMusicAlbums();
  const { data: collabsData } = useCollaborations();
  const { data: searchedArtists } = useArtistSearch(collabSearch);

  // Re-trigger GT when portal data finishes loading (content wasn't in DOM when GT first ran)
  useGTRetranslate([
    loadingArtists,
    loadingTracks,
    loadingAnalytics,
    activeTab,
  ]);

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

  // ── Auth check on mount — unified additive portal access system ──
  const { user: authCtxUser, token: authCtxToken, login } = useAuthContext();
  const { allowed: portalAllowed, loading: portalLoading } =
    useRequirePortal("artist");

  useEffect(() => {
    // Hydrate in-memory auth token from the unified key
    const storedToken =
      localStorage.getItem("authToken") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token");

    if (storedToken) {
      import("@/lib/auth").then(({ setAuthToken }) =>
        setAuthToken(storedToken),
      );
    }

    if (portalLoading) return;

    if (portalAllowed && authCtxUser) {
      if (authCtxToken) {
        import("@/lib/auth").then(({ setAuthToken }) =>
          setAuthToken(authCtxToken),
        );
      }
      setIsLoggedIn(true);
      setAuthLoading(false);
      resolveConnectedUser(authCtxUser as any);
      setTimeout(() => setPortalRevealed(true), 200);
    } else {
      setAuthLoading(false);
    }
  }, [
    resolveConnectedUser,
    authCtxUser,
    authCtxToken,
    portalAllowed,
    portalLoading,
  ]);

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
        // Store token in memory + all localStorage keys for cross-portal auth
        if (data.token) {
          const { setAuthToken } = await import("@/lib/auth");
          setAuthToken(data.token);
          localStorage.setItem("artist_token", data.token);
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("auth_token", data.token);
          localStorage.setItem("token", data.token);
        }
        if (data.user) {
          localStorage.setItem("artist_profile", JSON.stringify(data.user));
          localStorage.setItem("auth_user", JSON.stringify(data.user));
        }
        // Update AuthContext React state so portal guards see the user
        if (data.token && data.user) {
          login(data.token, data.user);
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
  const [uploadForm, setUploadForm] = useState<{
    title: string;
    genre: string | undefined;
    description: string;
    price: string;
    bpm: string;
    musicalKey: string;
    mood: string;
    releaseType: string;
  }>({
    title: "",
    genre: undefined,
    description: "",
    price: "0.99",
    bpm: "",
    musicalKey: "",
    mood: "",
    releaseType: "single",
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
    if (uploadForm.genre) formData.append("genre", uploadForm.genre);
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
          genre: undefined,
          description: "",
          price: "0.99",
          bpm: "",
          musicalKey: "",
          mood: "",
          releaseType: "single",
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

  // Handle re-upload for tracks that lost their audio after Render redeploy
  const reuploadInputRef = useRef<HTMLInputElement | null>(null);
  const [reuploadTrackId, setReuploadTrackId] = useState<number | null>(null);
  const handleReupload = useCallback(
    async (file: File) => {
      if (!reuploadTrackId || !file) return;
      const formData = new FormData();
      formData.append("audio", file);
      try {
        const { getCsrfToken, initializeCsrfToken } =
          await import("@/lib/auth");
        let csrf = getCsrfToken();
        if (!csrf) {
          await initializeCsrfToken();
          csrf = getCsrfToken();
        }
        const headers: Record<string, string> = {};
        if (csrf) headers["x-csrf-token"] = csrf;
        const token = (await import("@/lib/auth")).getAuthToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `/api/music/tracks/${reuploadTrackId}/reupload`,
          { method: "PUT", body: formData, credentials: "include", headers },
        );
        const data = await res.json();
        if (data.success) {
          invalidateTracks();
          alert("✅ Audio re-uploaded successfully!");
        } else {
          alert("Re-upload failed: " + (data.error || "Unknown error"));
        }
      } catch (err: any) {
        alert("Re-upload failed: " + (err.message || "Network error"));
      }
      setReuploadTrackId(null);
    },
    [reuploadTrackId, invalidateTracks],
  );

  // ── Track Edit state & handler ──
  const [editingTrack, setEditingTrack] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    genre: "",
    description: "",
    mood: "",
    bpm: "",
    musicalKey: "",
    price: "",
    lyrics: "",
    pochette: "",       // base64 data-URI for cover image
    btsContent: "",     // Behind The Scenes
    flopNotes: "",      // FLOP — outtakes, fails, funny stories
    credits: "",        // Production credits, featured artists
    recordingLocation: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const pochetteInputRef = useRef<HTMLInputElement | null>(null);

  const openEditTrack = useCallback((track: any) => {
    setEditingTrack(track);
    setEditForm({
      title: track.title || "",
      genre: (track as any).genre || "",
      description: (track as any).description || "",
      mood: (track as any).mood || "",
      bpm: String((track as any).bpm || ""),
      musicalKey: (track as any).musicalKey || (track as any).musical_key || "",
      price: (track as any).price || "0.99",
      lyrics: (track as any).lyrics || "",
      pochette: (track as any).pochette || "",
      btsContent: (track as any).btsContent || (track as any).bts_content || "",
      flopNotes: (track as any).flopNotes || (track as any).flop_notes || "",
      credits: (track as any).credits || "",
      recordingLocation: (track as any).recordingLocation || (track as any).recording_location || "",
    });
  }, []);

  const handlePochetteUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image trop grande (max 5 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditForm(prev => ({ ...prev, pochette: reader.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingTrack) return;
    setEditSaving(true);
    try {
      const { getCsrfToken, initializeCsrfToken, getAuthToken } =
        await import("@/lib/auth");
      let csrf = getCsrfToken();
      if (!csrf) {
        await initializeCsrfToken();
        csrf = getCsrfToken();
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrf) headers["x-csrf-token"] = csrf;
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/music/tracks/${editingTrack.id}/edit`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      invalidateTracks();
      setEditingTrack(null);
    } catch (err: any) {
      alert("Erreur: " + (err.message || "Impossible de sauvegarder"));
    } finally {
      setEditSaving(false);
    }
  }, [editingTrack, editForm, invalidateTracks]);

  // Handle track download with credit-based purchase gate
  const handleDownloadTrack = useCallback(async (trackId: number | string) => {
    try {
      const res = await fetch(`/api/music/tracks/${trackId}/download`, {
        credentials: "include",
      });

      if (res.status === 401) {
        alert("Connectez-vous pour télécharger ce titre.");
        return;
      }

      if (res.status === 402) {
        const data = await res.json();
        const price = data.price ?? 99;
        const title = data.trackTitle || "Ce titre";
        const balanceInfo =
          data.balance !== undefined
            ? ` (votre solde: ${data.balance} cr)`
            : "";
        const proceed = window.confirm(
          `"${title}" coûte ${price} crédits${balanceInfo}.\n\nAcheter maintenant?`,
        );
        if (!proceed) return;

        // Attempt credit purchase
        const purchaseRes = await fetch(
          `/api/music/tracks/${trackId}/purchase`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          },
        );
        const purchaseData = await purchaseRes.json();

        if (purchaseRes.status === 402) {
          alert(
            `Solde insuffisant — il vous faut ${purchaseData.required} crédits (solde: ${purchaseData.balance} cr). Rechargez dans l'Arcade!`,
          );
          return;
        }

        if (!purchaseRes.ok) {
          alert(purchaseData.error || "Échec de l'achat.");
          return;
        }

        // Purchase succeeded — retry the download
        const retryRes = await fetch(`/api/music/tracks/${trackId}/download`, {
          credentials: "include",
        });
        if (!retryRes.ok) {
          alert("Achat réussi! Mais le téléchargement a échoué. Réessayez.");
          return;
        }
        const blob = await retryRes.blob();
        const disposition = retryRes.headers.get("content-disposition");
        let filename = `track-${trackId}.mp3`;
        if (disposition) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      if (!res.ok) {
        alert("Échec du téléchargement.");
        return;
      }

      // Success — trigger browser download from blob
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      let filename = `track-${trackId}.mp3`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erreur réseau lors du téléchargement.");
    }
  }, []);

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
  // Only show tracks belonging to the logged-in artist
  const displayTracks = (tracks || []).filter((t: any) => {
    if (!myArtist?.id) return true; // Show all while loading artist profile
    return String(t.artistId || t.artist_id) === String(myArtist.id);
  });

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

  // Collaborations from API
  const displayCollaborations: Collaboration[] = (collabsData || []).map(
    (c: any) => ({
      id: String(c.id),
      artist: c.requester_name || c.target_name || "Artiste",
      status: c.status as "active" | "pending" | "completed",
      track: c.track_title || "—",
      revenueShare: c.revenue_share || 50,
      date: c.created_at
        ? new Date(c.created_at).toLocaleDateString("fr-FR")
        : "—",
    }),
  );

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
      const hasAudio = !!(track as any).hasAudio || !!(track as any).file_path;
      if (!hasAudio) return;

      const trackId =
        typeof track.id === "string"
          ? parseInt(track.id, 10)
          : Number(track.id);
      // Find artist name for display in global player
      const artistName =
        displayArtists.find((a) => a.id === track.artistId)?.name ||
        connectedUser.name ||
        "Artiste";

      globalAudio.playTrack({
        id: trackId,
        title: track.title,
        artist_id: track.artistId ? Number(track.artistId) : undefined,
        artist_name: artistName,
        duration: track.duration || 0,
        file_path: (track as any).file_path || "uploaded",
        cover_art: (track as any).coverArt || null,
        genre: (track as any).genre || null,
      });
      // Start royalty tracking
      startStream(trackId);
    },
    [startStream, globalAudio, displayArtists, connectedUser.name],
  );

  const handleTogglePlayPause = useCallback(() => {
    if (!currentTrack) return;
    globalAudio.togglePlay();
    if (isPlaying) {
      pauseStream();
    } else {
      resumeStream();
    }
  }, [isPlaying, currentTrack, pauseStream, resumeStream, globalAudio]);

  const handleSkipTrack = useCallback(
    (direction: "next" | "prev") => {
      if (direction === "next") {
        globalAudio.next();
      } else {
        globalAudio.previous();
      }
    },
    [globalAudio],
  );

  const handleSeek = useCallback(
    (values: number[]) => {
      if (!audioDuration) return;
      const pct = values[0];
      globalAudio.seekPercent(pct / 100);
    },
    [audioDuration, globalAudio],
  );

  // Sync volume slider → global audio
  useEffect(() => {
    globalAudio.setVolume((volume[0] ?? 50) / 100);
  }, [volume, globalAudio]);

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
              onClick={() => setActiveTab("music")}
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
              onClick={() => setActiveTab("music")}
            >
              Voir tout
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayArtists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-3">
                    <Music2 className="h-7 w-7 text-purple-400/50" />
                  </div>
                  <p className="text-purple-200 font-medium">
                    Aucun artiste classé
                  </p>
                  <p className="text-purple-300/60 text-sm mt-1">
                    Le classement se remplira au fur et à mesure des
                    inscriptions
                  </p>
                </div>
              ) : (
                displayArtists.slice(0, 5).map((artist, index) => (
                  <div
                    key={artist.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/artist-catalogue/${artist.id}`)
                    }
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
                          <p className="text-white font-medium">
                            {artist.name}
                          </p>
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
                      {(() => {
                        // Compute growth: position-based ranking metric
                        const artistStreams = (artist as any).totalStreams || 0;
                        const avgStreams =
                          totalStreams / Math.max(totalArtists, 1);
                        const growth =
                          avgStreams > 0
                            ? Math.round(
                                ((artistStreams - avgStreams) / avgStreams) *
                                  100,
                              )
                            : 0;
                        return (
                          <>
                            <div className="flex items-center justify-end space-x-1">
                              {growth >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-400" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-400" />
                              )}
                              <span
                                className={
                                  growth >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }
                              >
                                {growth >= 0 ? "+" : ""}
                                {growth}%
                              </span>
                            </div>
                            <p className="text-purple-200 text-sm">
                              vs moyenne
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
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
            className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-400 hover:via-fuchsia-400 hover:to-pink-400 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 font-medium"
          >
            <Upload className="mr-2 h-4 w-4" />
            Téléverser un nouveau titre
          </Button>
          <Button
            variant="outline"
            className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
            onClick={() => setShowAlbumModal(true)}
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
            <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white notranslate">
              <SelectValue placeholder="Filtrer par genre" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20 notranslate">
              <SelectItem value="all">Tous les genres</SelectItem>
              <SelectItem value="Afrobeats">Afrobeats</SelectItem>
              <SelectItem value="Amapiano">Amapiano</SelectItem>
              <SelectItem value="RnB">R&B</SelectItem>
              <SelectItem value="Hip-Hop">Hip Hop</SelectItem>
              <SelectItem value="Rap">Rap</SelectItem>
              <SelectItem value="Trap">Trap</SelectItem>
              <SelectItem value="Drill">Drill</SelectItem>
              <SelectItem value="Pop">Pop</SelectItem>
              <SelectItem value="Rock">Rock</SelectItem>
              <SelectItem value="Jazz">Jazz</SelectItem>
              <SelectItem value="Soul">Soul</SelectItem>
              <SelectItem value="Reggae">Reggae</SelectItem>
              <SelectItem value="Dancehall">Dancehall</SelectItem>
              <SelectItem value="Electronic">Électronique</SelectItem>
              <SelectItem value="Classical">Classique</SelectItem>
              <SelectItem value="Gospel">Gospel</SelectItem>
              <SelectItem value="Latin">Latin</SelectItem>
              <SelectItem value="Zouk">Zouk</SelectItem>
              <SelectItem value="Coupe-Decale">Coupé-Décalé</SelectItem>
              <SelectItem value="Zouglou">Zouglou</SelectItem>
              <SelectItem value="Funk">Funk</SelectItem>
              <SelectItem value="Blues">Blues</SelectItem>
              <SelectItem value="Country">Country</SelectItem>
              <SelectItem value="Metal">Metal</SelectItem>
              <SelectItem value="Folk">Folk</SelectItem>
              <SelectItem value="Acoustic">Acoustique</SelectItem>
              <SelectItem value="Lo-fi">Lo-fi</SelectItem>
              <SelectItem value="Ambient">Ambient</SelectItem>
              <SelectItem value="World">World Music</SelectItem>
              <SelectItem value="Other">Autre</SelectItem>
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

      {/* Albums Section */}
      {(albumsData || []).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-purple-400" />
            Albums & EPs
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(albumsData || []).map((album: any) => (
              <Card
                key={album.id}
                className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-purple-400/30 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <CardContent className="p-4">
                  <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center mb-3">
                    <Music2 className="h-10 w-10 text-white/40" />
                  </div>
                  <p className="text-white font-medium text-sm truncate">
                    {album.title}
                  </p>
                  <p className="text-purple-200/60 text-xs">
                    {album.album_type?.toUpperCase() || "ALBUM"} •{" "}
                    {album.track_count || album.total_tracks || 0} titres
                  </p>
                  {album.genre && (
                    <Badge
                      variant="outline"
                      className="mt-1 border-purple-400/30 text-purple-300 text-[10px]"
                    >
                      {album.genre}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
                    {/* Pochette background if available */}
                    {((track as any).pochette || (track as any).cover_art || (track as any).coverArt) && (
                      <img
                        src={(track as any).pochette || (track as any).cover_art || (track as any).coverArt}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {hasAudio ? (
                        !((track as any).pochette || (track as any).cover_art || (track as any).coverArt) && (
                          <div className="text-center">
                            <Music2 className="h-14 w-14 text-purple-400/60 mx-auto" />
                            <span className="text-[10px] text-green-400/70 mt-1 block">
                              ♦ TÉLÉVERSÉ
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="text-center">
                          <Music2 className="h-14 w-14 text-white/30 mx-auto" />
                          <button
                            className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReuploadTrackId(Number(track.id));
                              reuploadInputRef.current?.click();
                            }}
                          >
                            ⚠️ Re-upload audio
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Price tag */}
                    {hasAudio && (
                      <div className="absolute top-3 right-3 bg-green-500/90 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                        ${trackPrice}
                      </div>
                    )}
                    {/* Always-visible play/download overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                        <Button
                          onClick={() => {
                            if (
                              currentTrack &&
                              String(currentTrack.id) === String(track.id) &&
                              isPlaying
                            ) {
                              handleTogglePlayPause();
                            } else {
                              handlePlayTrack(track);
                            }
                          }}
                          className={`flex-1 backdrop-blur-sm text-white transition-all ${
                            currentTrack &&
                            String(currentTrack.id) === String(track.id) &&
                            isPlaying
                              ? "bg-purple-500/60 hover:bg-purple-500/80 ring-2 ring-purple-400/50"
                              : "bg-white/20 hover:bg-white/30"
                          }`}
                          disabled={!hasAudio}
                          translate="no"
                        >
                          {currentTrack &&
                          String(currentTrack.id) === String(track.id) &&
                          isPlaying ? (
                            <span className="inline-flex items-center notranslate">
                              <Pause className="mr-1 h-4 w-4 animate-pulse" />
                              <span>Pause</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center notranslate">
                              <Play className="mr-1 h-4 w-4" />
                              <span>Écouter</span>
                            </span>
                          )}
                        </Button>
                        {hasAudio && (
                          <Button
                            onClick={() => handleDownloadTrack(track.id)}
                            className="bg-green-600/80 hover:bg-green-500 text-white"
                            size="icon"
                            title="Télécharger"
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
                              onClick={() => handleDownloadTrack(track.id)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Télécharger
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-white">
                            <Share2 className="mr-2 h-4 w-4" />
                            Partager
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-purple-400"
                            onClick={() => openEditTrack(track)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier le titre
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/20" />
                          {!hasAudio && (
                            <DropdownMenuItem
                              className="text-amber-400"
                              onClick={() => {
                                setReuploadTrackId(Number(track.id));
                                reuploadInputRef.current?.click();
                              }}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Re-upload Audio
                            </DropdownMenuItem>
                          )}
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
                    {/* BTS / FLOP / Credits badges */}
                    {((track as any).btsContent || (track as any).bts_content || (track as any).flopNotes || (track as any).flop_notes || (track as any).credits) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {((track as any).btsContent || (track as any).bts_content) && (
                          <Badge className="bg-blue-500/20 text-blue-300 text-[9px] border-blue-500/30">
                            <Video className="h-2.5 w-2.5 mr-0.5" /> BTS
                          </Badge>
                        )}
                        {((track as any).flopNotes || (track as any).flop_notes) && (
                          <Badge className="bg-red-500/20 text-red-300 text-[9px] border-red-500/30">
                            <Zap className="h-2.5 w-2.5 mr-0.5" /> FLOP
                          </Badge>
                        )}
                        {(track as any).credits && (
                          <Badge className="bg-amber-500/20 text-amber-300 text-[9px] border-amber-500/30">
                            <Award className="h-2.5 w-2.5 mr-0.5" /> Crédits
                          </Badge>
                        )}
                      </div>
                    )}
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
                        onClick={() => {
                          if (
                            currentTrack &&
                            String(currentTrack.id) === String(track.id) &&
                            isPlaying
                          ) {
                            handleTogglePlayPause();
                          } else {
                            handlePlayTrack(track);
                          }
                        }}
                        className={`absolute inset-0 rounded-lg flex items-center justify-center transition-all ${
                          currentTrack &&
                          String(currentTrack.id) === String(track.id) &&
                          isPlaying
                            ? "bg-purple-500/60 opacity-100 ring-2 ring-purple-400/50"
                            : "bg-black/60 opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {currentTrack &&
                        String(currentTrack.id) === String(track.id) &&
                        isPlaying ? (
                          <Pause className="h-4 w-4 text-white animate-pulse" />
                        ) : (
                          <Play className="h-4 w-4 text-white" />
                        )}
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
                      onClick={() => handleDownloadTrack(track.id)}
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
                          onClick={() => handleDownloadTrack(track.id)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-white">
                        <Share2 className="mr-2 h-4 w-4" />
                        Partager
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-purple-400"
                        onClick={() => openEditTrack(track)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier le titre
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/20" />
                      {!hasAudio && (
                        <DropdownMenuItem
                          className="text-amber-400"
                          onClick={() => {
                            setReuploadTrackId(Number(track.id));
                            reuploadInputRef.current?.click();
                          }}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Re-upload Audio
                        </DropdownMenuItem>
                      )}
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
            className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white hover:border-purple-400"
          >
            <Calendar className="mr-2 h-4 w-4" />
            30 derniers jours
          </Button>
          <Button
            variant="outline"
            className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white hover:border-purple-400"
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
              className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white hover:border-purple-400"
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

        {/* ── Artist ID Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-white/10"
        >
          {/* Gradient background + noise texture */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-indigo-900/50 to-fuchsia-900/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_50%)]" />

          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Left: Avatar + Badge */}
              <div className="flex-shrink-0 relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  {profile?.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt={profile.stageName}
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-2xl">
                      {connectedUser.initials}
                    </span>
                  )}
                </div>
                {/* Badge tier icon */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-black/80 border-2 border-purple-400/50 flex items-center justify-center text-lg">
                  {["🌱", "🥉", "🥈", "🥇", "💎", "👑", "⚡"][
                    (badge?.tier || 1) - 1
                  ] || "🌱"}
                </div>
              </div>

              {/* Center: Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h3 className="text-white font-bold text-lg truncate">
                    {profile?.stageName || connectedUser.name}
                  </h3>
                  <p className="text-purple-200/60 text-xs">
                    {badge?.name || "Initiate"} •{" "}
                    {(profile as any)?.division ? (
                      <span className="capitalize">
                        {(profile as any).division}
                      </span>
                    ) : (
                      "Discovery"
                    )}{" "}
                    Division
                  </p>
                </div>
                {/* Artist Code */}
                {(profile as any)?.artistCode ? (
                  <div className="inline-flex items-center gap-2 bg-black/40 border border-purple-500/30 rounded-xl px-3 py-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <code className="text-purple-300 text-sm font-mono tracking-wider">
                      {(profile as any).artistCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          (profile as any).artistCode,
                        );
                      }}
                      className="ml-1 text-white/30 hover:text-white/60 transition-colors"
                      title="Copier le code"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-white/20 text-xs italic">
                    Code artiste en cours de génération…
                  </p>
                )}
                {/* Genre + Country row */}
                <div className="flex flex-wrap gap-2">
                  {profile?.genre &&
                    (Array.isArray(profile.genre)
                      ? profile.genre
                      : [profile.genre]
                    )
                      .slice(0, 3)
                      .map((g: string, i: number) => (
                        <Badge
                          key={i}
                          className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5"
                        >
                          {g}
                        </Badge>
                      ))}
                  {profile?.country && (
                    <Badge className="bg-white/10 text-white/60 text-[10px] px-2 py-0.5">
                      {(profile as any)?.countryCode
                        ? `${(profile as any).countryCode.toUpperCase()} — `
                        : ""}
                      {profile.country}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right: Stats mini */}
              <div className="flex sm:flex-col gap-3 sm:gap-2 sm:text-right flex-shrink-0">
                <div>
                  <p className="text-white font-bold text-lg">
                    {(profile?.lifetimeStreams || 0).toLocaleString()}
                  </p>
                  <p className="text-white/30 text-[10px]">écoutes totales</p>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">
                    #{badge?.tier || 1}
                  </p>
                  <p className="text-white/30 text-[10px]">Tier actuel</p>
                </div>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/20">
              <span>Verso Air Music • Carte Artiste</span>
              <span>{new Date().getFullYear()}</span>
            </div>
          </div>
        </motion.div>

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

  const renderCollaborations = () => {
    // Use server-side search results when query present, otherwise all artists
    const filteredCollabArtists =
      collabSearch && searchedArtists ? searchedArtists : displayArtists;

    return (
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
              className="border-purple-400/50 text-purple-200 hover:bg-purple-500/20 hover:text-white hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
              onClick={() => setShowCollabSearch(!showCollabSearch)}
            >
              <Users2 className="mr-2 h-4 w-4" />
              {showCollabSearch
                ? "Masquer la recherche"
                : "Trouver des artistes"}
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 hover:from-purple-400 hover:via-fuchsia-400 hover:to-pink-400 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 font-medium"
              onClick={() => {
                setShowCollabSearch(true);
                setCollabSearch("");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle collaboration
            </Button>
          </div>
        </div>

        {/* Artist Search Panel */}
        {showCollabSearch && (
          <Card className="bg-white/5 backdrop-blur-md border-purple-400/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-purple-400" />
                Rechercher des artistes
              </CardTitle>
              <CardDescription className="text-purple-200">
                Trouvez des artistes avec qui collaborer — aucune restriction de
                pays
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Rechercher par nom ou genre..."
                  value={collabSearch}
                  onChange={(e) => setCollabSearch(e.target.value)}
                  className="bg-white/10 border-white/30 text-white placeholder-purple-200/50"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto">
                  {filteredCollabArtists.length === 0 ? (
                    <p className="text-white/30 text-sm col-span-full text-center py-6">
                      {collabSearch
                        ? "Aucun artiste trouvé"
                        : "Tapez un nom pour chercher"}
                    </p>
                  ) : (
                    filteredCollabArtists.slice(0, 12).map((artist) => (
                      <div
                        key={artist.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-400/30 transition-all cursor-pointer group"
                        onClick={() =>
                          window.open(
                            `/artist-catalogue/${artist.id}`,
                            "_blank",
                          )
                        }
                        title="Voir le profil de l'artiste"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={(artist as any).avatar || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                            {artist.name?.charAt(0) ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {artist.name}
                          </p>
                          <p className="text-purple-200/60 text-xs">
                            {artist.genre || "—"} •{" "}
                            {(artist as any).country || "Mondial"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-purple-400 hover:text-white hover:bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCollabTargetArtist(artist);
                            setShowCollabRequestModal(true);
                          }}
                          title="Proposer une collaboration"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                {filteredCollabArtists.length > 12 && (
                  <p className="text-purple-200/40 text-xs text-center">
                    +{filteredCollabArtists.length - 12} autres artistes —
                    affinez votre recherche
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Collaborations */}
          <Card className="bg-white/5 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">
                Collaborations actives
              </CardTitle>
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
                            onClick={async () => {
                              try {
                                await updateCollabStatus(
                                  parseInt(collab.id),
                                  "active",
                                );
                                invalidateTracks();
                              } catch {}
                            }}
                          >
                            <Check className="mr-2 h-3 w-3" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-400 text-red-400 hover:bg-red-400/10"
                            onClick={async () => {
                              try {
                                await updateCollabStatus(
                                  parseInt(collab.id),
                                  "declined",
                                );
                                invalidateTracks();
                              } catch {}
                            }}
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
  };

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
      {/* Hidden file input for re-uploading audio to existing tracks */}
      <input
        ref={reuploadInputRef}
        type="file"
        accept=".mp3,.wav,.flac,.aiff,.ogg,.m4a,audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReupload(file);
          e.target.value = "";
        }}
      />
      {/* Global AudioPlayer (in App.tsx) handles the Now Playing bar */}

      {/* Hidden pochette image input */}
      <input
        ref={pochetteInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handlePochetteUpload}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EDIT TRACK DIALOG                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Dialog open={!!editingTrack} onOpenChange={(open) => { if (!open) setEditingTrack(null); }}>
        <DialogContent className="bg-gray-950 border-purple-500/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-purple-400" />
              Modifier le titre
            </DialogTitle>
            <DialogDescription className="text-purple-200/60">
              Pochette, BTS, FLOP, crédits et métadonnées
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* ── Pochette (Cover Image) ── */}
            <div className="space-y-2">
              <Label className="text-purple-200 font-semibold flex items-center gap-2">
                <Image className="h-4 w-4" /> Pochette / Cover Art
              </Label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => pochetteInputRef.current?.click()}
                  className="w-28 h-28 rounded-xl border-2 border-dashed border-purple-500/30 hover:border-purple-400/60 bg-purple-500/5 flex items-center justify-center transition-all overflow-hidden group"
                >
                  {editForm.pochette ? (
                    <img src={editForm.pochette} alt="Pochette" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-6 w-6 text-purple-400/60 mx-auto group-hover:text-purple-300" />
                      <span className="text-[10px] text-purple-300/50 mt-1 block">Ajouter</span>
                    </div>
                  )}
                </button>
                <div className="flex-1 text-sm text-purple-200/50 space-y-1">
                  <p>PNG, JPEG, WebP — max 5 MB</p>
                  {editForm.pochette && (
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, pochette: "" }))}
                      className="text-red-400 hover:text-red-300 text-xs underline"
                    >
                      Supprimer l'image
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Basic Info Row ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-purple-200 text-sm">Titre</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Nom du titre"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-purple-200 text-sm">Genre</Label>
                <Input
                  value={editForm.genre}
                  onChange={(e) => setEditForm(prev => ({ ...prev, genre: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Hip-Hop, Pop, R&B..."
                />
              </div>
            </div>

            {/* ── Technical Row ── */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-purple-200 text-sm">BPM</Label>
                <Input
                  type="number"
                  value={editForm.bpm}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bpm: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="128"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-purple-200 text-sm">Tonalité</Label>
                <Input
                  value={editForm.musicalKey}
                  onChange={(e) => setEditForm(prev => ({ ...prev, musicalKey: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="C Major, A Minor..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-purple-200 text-sm">Prix ($)</Label>
                <Input
                  value={editForm.price}
                  onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="0.99"
                />
              </div>
            </div>

            {/* ── Mood & Location ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-purple-200 text-sm flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Ambiance / Mood
                </Label>
                <Input
                  value={editForm.mood}
                  onChange={(e) => setEditForm(prev => ({ ...prev, mood: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Chill, Energetic, Dark..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-purple-200 text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Lieu d'enregistrement
                </Label>
                <Input
                  value={editForm.recordingLocation}
                  onChange={(e) => setEditForm(prev => ({ ...prev, recordingLocation: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Studio X, Paris..."
                />
              </div>
            </div>

            {/* ── Description ── */}
            <div className="space-y-1.5">
              <Label className="text-purple-200 text-sm">Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white min-h-[70px]"
                placeholder="À propos de ce titre..."
              />
            </div>

            {/* ── Credits ── */}
            <div className="space-y-1.5">
              <Label className="text-purple-200 text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" /> Crédits & Collaborateurs
              </Label>
              <Textarea
                value={editForm.credits}
                onChange={(e) => setEditForm(prev => ({ ...prev, credits: e.target.value }))}
                className="bg-white/5 border-white/10 text-white min-h-[60px]"
                placeholder="Prod: ..., Mix: ..., feat. ..."
              />
            </div>

            {/* ── BTS (Behind The Scenes) ── */}
            <div className="space-y-1.5">
              <Label className="text-purple-200 text-sm font-semibold flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-400" /> BTS — Behind The Scenes
              </Label>
              <p className="text-purple-300/40 text-xs -mt-1">L'histoire derrière la création, les anecdotes de studio</p>
              <Textarea
                value={editForm.btsContent}
                onChange={(e) => setEditForm(prev => ({ ...prev, btsContent: e.target.value }))}
                className="bg-white/5 border-white/10 text-white min-h-[80px]"
                placeholder="L'histoire de cette chanson..."
              />
            </div>

            {/* ── FLOP Notes ── */}
            <div className="space-y-1.5">
              <Label className="text-purple-200 text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-400" /> FLOP — Outtakes & Fails
              </Label>
              <p className="text-purple-300/40 text-xs -mt-1">Les moments ratés, les prises hilarantes, les faux départs</p>
              <Textarea
                value={editForm.flopNotes}
                onChange={(e) => setEditForm(prev => ({ ...prev, flopNotes: e.target.value }))}
                className="bg-white/5 border-white/10 text-white min-h-[80px]"
                placeholder="On a dû refaire le refrain 47 fois..."
              />
            </div>

            {/* ── Lyrics ── */}
            <div className="space-y-1.5">
              <Label className="text-purple-200 text-sm flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Paroles / Lyrics
              </Label>
              <Textarea
                value={editForm.lyrics}
                onChange={(e) => setEditForm(prev => ({ ...prev, lyrics: e.target.value }))}
                className="bg-white/5 border-white/10 text-white min-h-[100px] font-mono text-sm"
                placeholder="Verse 1:\n..."
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditingTrack(null)}
              className="text-purple-200 hover:text-white"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editSaving || !editForm.title.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              {editSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Sauvegarder
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {incognitoMode ? (
                    <Badge className="bg-gray-600/50 text-gray-300 border border-gray-500/30">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Incognito
                    </Badge>
                  ) : (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <Crown className="h-3 w-3 mr-1" />
                      {connectedUser.tier}
                    </Badge>
                  )}
                  <span className="text-purple-200 text-sm">
                    Bon retour, {connectedUser.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Incognito Mode Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`relative transition-all ${incognitoMode ? "text-green-400 bg-green-500/10" : "text-purple-200 hover:text-white"}`}
                      onClick={() => {
                        const next = !incognitoMode;
                        setIncognitoMode(next);
                        localStorage.setItem("artist_incognito", String(next));
                      }}
                    >
                      {incognitoMode ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-gray-900 border-white/20 text-white"
                  >
                    {incognitoMode
                      ? "Mode incognito activé — vous apparaissez comme un auditeur"
                      : "Activer le mode incognito — se fondre dans la masse"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
                  <DropdownMenuItem
                    className="text-white cursor-pointer"
                    onClick={() => setActiveTab("royalties")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profil & Royalties
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white cursor-pointer"
                    onClick={() => setActiveTab("analytics")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Analyses & Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-white cursor-pointer"
                    onClick={() => setActiveTab("royalties")}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Facturation & Paiements
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem
                    className="text-white cursor-pointer"
                    onClick={() => window.open("/faq", "_blank")}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Assistance
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400 cursor-pointer"
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
                      <SelectTrigger className="w-[160px] bg-white/5 border-white/20 text-white notranslate">
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

            {/* Release Type */}
            <div className="space-y-2">
              <Label>Type de sortie</Label>
              <Select
                value={uploadForm.releaseType}
                onValueChange={(v) =>
                  setUploadForm((prev) => ({ ...prev, releaseType: v }))
                }
              >
                <SelectTrigger className="bg-white/10 border-white/30 notranslate">
                  <SelectValue placeholder="Type de sortie" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20 notranslate">
                  <SelectItem value="single">Single (1 titre)</SelectItem>
                  <SelectItem value="ep">EP (4–6 titres)</SelectItem>
                  <SelectItem value="mixtape">Mixtape (7–15 titres)</SelectItem>
                  <SelectItem value="album">Album (8–20+ titres)</SelectItem>
                </SelectContent>
              </Select>
              {uploadForm.releaseType !== "single" && (
                <p className="text-xs text-purple-200/60">
                  {uploadForm.releaseType === "ep" &&
                    "Un EP contient généralement 4 à 6 titres."}
                  {uploadForm.releaseType === "mixtape" &&
                    "Une mixtape contient généralement 7 à 15 titres."}
                  {uploadForm.releaseType === "album" &&
                    "Un album contient généralement 8 à 20+ titres."}{" "}
                  Téléversez chaque titre séparément.
                </p>
              )}
            </div>

            {/* Genre + Price row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="notranslate">Genre</Label>
                <Select
                  value={uploadForm.genre}
                  onValueChange={(v) =>
                    setUploadForm((prev) => ({ ...prev, genre: v }))
                  }
                >
                  <SelectTrigger className="bg-white/10 border-white/30 notranslate">
                    <SelectValue placeholder="Sélectionner le genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20 max-h-[300px] notranslate">
                    <SelectItem value="Afrobeats">Afrobeats</SelectItem>
                    <SelectItem value="Amapiano">Amapiano</SelectItem>
                    <SelectItem value="RnB">R&B</SelectItem>
                    <SelectItem value="Hip-Hop">Hip Hop</SelectItem>
                    <SelectItem value="Rap">Rap</SelectItem>
                    <SelectItem value="Trap">Trap</SelectItem>
                    <SelectItem value="Drill">Drill</SelectItem>
                    <SelectItem value="Pop">Pop</SelectItem>
                    <SelectItem value="Rock">Rock</SelectItem>
                    <SelectItem value="Jazz">Jazz</SelectItem>
                    <SelectItem value="Soul">Soul</SelectItem>
                    <SelectItem value="Reggae">Reggae</SelectItem>
                    <SelectItem value="Dancehall">Dancehall</SelectItem>
                    <SelectItem value="Electronic">Électronique</SelectItem>
                    <SelectItem value="Classical">Classique</SelectItem>
                    <SelectItem value="Gospel">Gospel</SelectItem>
                    <SelectItem value="Latin">Latin</SelectItem>
                    <SelectItem value="Zouk">Zouk</SelectItem>
                    <SelectItem value="Coupe-Decale">Coupé-Décalé</SelectItem>
                    <SelectItem value="Zouglou">Zouglou</SelectItem>
                    <SelectItem value="Funk">Funk</SelectItem>
                    <SelectItem value="Blues">Blues</SelectItem>
                    <SelectItem value="Country">Country</SelectItem>
                    <SelectItem value="Metal">Metal</SelectItem>
                    <SelectItem value="Folk">Folk</SelectItem>
                    <SelectItem value="Acoustic">Acoustique</SelectItem>
                    <SelectItem value="Lo-fi">Lo-fi</SelectItem>
                    <SelectItem value="Ambient">Ambient</SelectItem>
                    <SelectItem value="World">World Music</SelectItem>
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

            {/* BPM / Key / Mood — collapsed by default */}
            <button
              type="button"
              onClick={() => setShowAdvancedUpload((p) => !p)}
              className="flex items-center gap-2 text-sm text-purple-300/70 hover:text-purple-200 transition-colors py-1"
            >
              {showAdvancedUpload ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Options avancées (BPM, Tonalité, Ambiance)
            </button>
            <div
              className={`grid grid-cols-3 gap-3 transition-all overflow-hidden ${showAdvancedUpload ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"}`}
            >
              <div className="space-y-2">
                <Label>BPM</Label>
                <Select
                  value={uploadForm.bpm}
                  onValueChange={(v) =>
                    setUploadForm((prev) => ({ ...prev, bpm: v }))
                  }
                >
                  <SelectTrigger className="bg-white/10 border-white/30 notranslate">
                    <SelectValue placeholder="Tempo" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20 max-h-[250px] notranslate">
                    <SelectItem value="60">60 — Lento</SelectItem>
                    <SelectItem value="70">70 — Adagio</SelectItem>
                    <SelectItem value="80">80 — Andante</SelectItem>
                    <SelectItem value="90">90 — Moderato</SelectItem>
                    <SelectItem value="100">100 — Allegretto</SelectItem>
                    <SelectItem value="110">110 — Allegro</SelectItem>
                    <SelectItem value="120">120 — Allegro</SelectItem>
                    <SelectItem value="128">128 — Dance</SelectItem>
                    <SelectItem value="130">130 — Allegro</SelectItem>
                    <SelectItem value="140">140 — Vivace</SelectItem>
                    <SelectItem value="150">150 — Vivace</SelectItem>
                    <SelectItem value="160">160 — Presto</SelectItem>
                    <SelectItem value="170">170 — Presto</SelectItem>
                    <SelectItem value="180">180 — Prestissimo</SelectItem>
                    <SelectItem value="200">200 — Prestissimo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tonalité</Label>
                <Select
                  value={uploadForm.musicalKey}
                  onValueChange={(v) =>
                    setUploadForm((prev) => ({ ...prev, musicalKey: v }))
                  }
                >
                  <SelectTrigger className="bg-white/10 border-white/30 notranslate">
                    <SelectValue placeholder="Clé" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20 max-h-[250px] notranslate">
                    <SelectItem value="C Major">Do Majeur</SelectItem>
                    <SelectItem value="C Minor">Do Mineur</SelectItem>
                    <SelectItem value="C# Major">Do# Majeur</SelectItem>
                    <SelectItem value="C# Minor">Do# Mineur</SelectItem>
                    <SelectItem value="D Major">Ré Majeur</SelectItem>
                    <SelectItem value="D Minor">Ré Mineur</SelectItem>
                    <SelectItem value="Eb Major">Mib Majeur</SelectItem>
                    <SelectItem value="Eb Minor">Mib Mineur</SelectItem>
                    <SelectItem value="E Major">Mi Majeur</SelectItem>
                    <SelectItem value="E Minor">Mi Mineur</SelectItem>
                    <SelectItem value="F Major">Fa Majeur</SelectItem>
                    <SelectItem value="F Minor">Fa Mineur</SelectItem>
                    <SelectItem value="F# Major">Fa# Majeur</SelectItem>
                    <SelectItem value="F# Minor">Fa# Mineur</SelectItem>
                    <SelectItem value="G Major">Sol Majeur</SelectItem>
                    <SelectItem value="G Minor">Sol Mineur</SelectItem>
                    <SelectItem value="Ab Major">Lab Majeur</SelectItem>
                    <SelectItem value="Ab Minor">Lab Mineur</SelectItem>
                    <SelectItem value="A Major">La Majeur</SelectItem>
                    <SelectItem value="A Minor">La Mineur</SelectItem>
                    <SelectItem value="Bb Major">Sib Majeur</SelectItem>
                    <SelectItem value="Bb Minor">Sib Mineur</SelectItem>
                    <SelectItem value="B Major">Si Majeur</SelectItem>
                    <SelectItem value="B Minor">Si Mineur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ambiance</Label>
                <Select
                  value={uploadForm.mood}
                  onValueChange={(v) =>
                    setUploadForm((prev) => ({ ...prev, mood: v }))
                  }
                >
                  <SelectTrigger className="bg-white/10 border-white/30 notranslate">
                    <SelectValue placeholder="Humeur" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20 max-h-[250px] notranslate">
                    <SelectItem value="Chill">Chill / Détendu</SelectItem>
                    <SelectItem value="Energetic">Énergique</SelectItem>
                    <SelectItem value="Dark">Sombre</SelectItem>
                    <SelectItem value="Happy">Joyeux</SelectItem>
                    <SelectItem value="Romantic">Romantique</SelectItem>
                    <SelectItem value="Melancholic">Mélancolique</SelectItem>
                    <SelectItem value="Aggressive">Agressif</SelectItem>
                    <SelectItem value="Dreamy">Rêveur</SelectItem>
                    <SelectItem value="Uplifting">Motivant</SelectItem>
                    <SelectItem value="Groovy">Groovy</SelectItem>
                    <SelectItem value="Epic">Épique</SelectItem>
                    <SelectItem value="Peaceful">Paisible</SelectItem>
                    <SelectItem value="Nostalgic">Nostalgique</SelectItem>
                    <SelectItem value="Party">Festif</SelectItem>
                    <SelectItem value="Spiritual">Spirituel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File upload zone */}
            <div className="space-y-2">
              <Label>Fichier audio *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.aiff,.ogg,.m4a"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
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
                    <SelectItem value="mixtape">Mixtape</SelectItem>
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

      {/* ═══════════════════════════════════════════════════════
          Album Creation Modal
          ═══════════════════════════════════════════════════════ */}
      <Dialog open={showAlbumModal} onOpenChange={setShowAlbumModal}>
        <DialogContent className="sm:max-w-[540px] bg-gray-900 border-white/20 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un album</DialogTitle>
            <DialogDescription className="text-purple-200">
              Regroupez vos titres dans un album, EP ou single
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre de l'album</Label>
              <Input
                value={albumForm.title}
                onChange={(e) =>
                  setAlbumForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Mon premier album..."
                className="bg-white/10 border-white/30 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={albumForm.albumType}
                  onValueChange={(v) =>
                    setAlbumForm((f) => ({ ...f, albumType: v }))
                  }
                >
                  <SelectTrigger className="bg-white/10 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="album">Album</SelectItem>
                    <SelectItem value="ep">EP</SelectItem>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="mixtape">Mixtape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select
                  value={albumForm.genre}
                  onValueChange={(v) =>
                    setAlbumForm((f) => ({ ...f, genre: v }))
                  }
                >
                  <SelectTrigger className="bg-white/10 border-white/30 text-white notranslate">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20 notranslate">
                    {[
                      "Afrobeats",
                      "Amapiano",
                      "RnB",
                      "Hip-Hop",
                      "Rap",
                      "Trap",
                      "Drill",
                      "Pop",
                      "Jazz",
                      "Reggae",
                      "Latin",
                      "Electronic",
                      "Dancehall",
                      "Gospel",
                      "Rock",
                      "Classical",
                      "Kompa",
                      "Coupé-décalé",
                      "Ndombolo",
                      "Zouk",
                      "Gqom",
                      "Kizomba",
                      "Bongo Flava",
                      "Highlife",
                      "Mbalax",
                      "Gnawa",
                      "Raï",
                      "Afro-Fusion",
                      "Afro-Pop",
                      "Afro-Soul",
                    ].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={albumForm.description}
                onChange={(e) =>
                  setAlbumForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="L'histoire derrière cet album..."
                className="bg-white/10 border-white/30 text-white min-h-[60px]"
              />
            </div>
            {/* Track Selection */}
            <div className="space-y-2">
              <Label>Titres à inclure</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-white/10 p-2 bg-white/5">
                {displayTracks.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-4">
                    Aucun titre disponible — téléversez d'abord des titres
                  </p>
                ) : (
                  displayTracks.map((track) => (
                    <label
                      key={track.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={albumForm.trackIds.includes(Number(track.id))}
                        onChange={(e) => {
                          const tid = Number(track.id);
                          setAlbumForm((f) => ({
                            ...f,
                            trackIds: e.target.checked
                              ? [...f.trackIds, tid]
                              : f.trackIds.filter((id) => id !== tid),
                          }));
                        }}
                        className="rounded border-purple-400"
                      />
                      <Music2 className="h-4 w-4 text-purple-300" />
                      <span className="text-white text-sm flex-1 truncate">
                        {track.title}
                      </span>
                      <span className="text-purple-200/50 text-xs">
                        {(track as any).genre || ""}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {albumForm.trackIds.length > 0 && (
                <p className="text-purple-200/60 text-xs">
                  {albumForm.trackIds.length} titre
                  {albumForm.trackIds.length > 1 ? "s" : ""} sélectionné
                  {albumForm.trackIds.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAlbumModal(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={albumCreating || !albumForm.title}
              onClick={async () => {
                setAlbumCreating(true);
                try {
                  await createAlbum(albumForm);
                  invalidateTracks();
                  setShowAlbumModal(false);
                  setAlbumForm({
                    title: "",
                    genre: "",
                    description: "",
                    albumType: "album",
                    trackIds: [],
                  });
                } catch (err: any) {
                  console.error("Album creation failed:", err);
                } finally {
                  setAlbumCreating(false);
                }
              }}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              {albumCreating ? "Création..." : "Créer l'album"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════
          Collaboration Request Modal — opens when clicking + on artist card
          ═══════════════════════════════════════════════════════ */}
      <Dialog
        open={showCollabRequestModal}
        onOpenChange={setShowCollabRequestModal}
      >
        <DialogContent className="sm:max-w-[480px] bg-gray-900 border-white/20 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-purple-400" />
              Proposer une collaboration
            </DialogTitle>
            <DialogDescription className="text-purple-200">
              {collabTargetArtist
                ? `Envoyer une demande à ${collabTargetArtist.name || collabTargetArtist.stage_name}`
                : "Collaboration musicale professionnelle"}
            </DialogDescription>
          </DialogHeader>
          {collabTargetArtist && (
            <div className="space-y-4 py-4">
              {/* Target artist info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-400/20">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    {(
                      collabTargetArtist.name ||
                      collabTargetArtist.stage_name ||
                      "?"
                    ).charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">
                    {collabTargetArtist.name || collabTargetArtist.stage_name}
                  </p>
                  <p className="text-purple-200/60 text-xs">
                    {collabTargetArtist.genre || "—"} •{" "}
                    {collabTargetArtist.country || "Mondial"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-purple-300 hover:text-white"
                  onClick={() =>
                    window.open(
                      `/artist-catalogue/${collabTargetArtist.id}`,
                      "_blank",
                    )
                  }
                >
                  <Eye className="h-4 w-4 mr-1" /> Profil
                </Button>
              </div>

              {/* Pro collaboration info */}
              <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Infos collaboration
                  professionnelle
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-white/5">
                    <p className="text-purple-200/60">Partage de revenus</p>
                    <p className="text-white font-medium">Standard 50/50</p>
                  </div>
                  <div className="p-2 rounded bg-white/5">
                    <p className="text-purple-200/60">Crédits</p>
                    <p className="text-white font-medium">feat. sur le titre</p>
                  </div>
                  <div className="p-2 rounded bg-white/5">
                    <p className="text-purple-200/60">Droits d'auteur</p>
                    <p className="text-white font-medium">
                      Co-écriture partagée
                    </p>
                  </div>
                  <div className="p-2 rounded bg-white/5">
                    <p className="text-purple-200/60">Publication</p>
                    <p className="text-white font-medium">
                      Distribué par Verso Air
                    </p>
                  </div>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm">Titre du projet (optionnel)</Label>
                  <Input
                    value={collabForm.trackTitle}
                    onChange={(e) =>
                      setCollabForm((f) => ({
                        ...f,
                        trackTitle: e.target.value,
                      }))
                    }
                    placeholder="Ex: Summer Vibes feat. ..."
                    className="bg-white/10 border-white/30 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Partage revenus (%)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={90}
                      value={collabForm.revenueShare}
                      onChange={(e) =>
                        setCollabForm((f) => ({
                          ...f,
                          revenueShare: parseInt(e.target.value) || 50,
                        }))
                      }
                      className="bg-white/10 border-white/30 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Genre</Label>
                    <Input
                      value={collabForm.genre}
                      onChange={(e) =>
                        setCollabForm((f) => ({ ...f, genre: e.target.value }))
                      }
                      placeholder="Afrobeats, Hip-Hop..."
                      className="bg-white/10 border-white/30 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Message d'introduction</Label>
                  <Textarea
                    value={collabForm.message}
                    onChange={(e) =>
                      setCollabForm((f) => ({ ...f, message: e.target.value }))
                    }
                    placeholder="Salut ! J'aimerais collaborer avec toi sur un projet..."
                    className="bg-white/10 border-white/30 text-white min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCollabRequestModal(false);
                setCollabTargetArtist(null);
              }}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              disabled={!collabTargetArtist}
              onClick={async () => {
                if (!collabTargetArtist) return;
                try {
                  await sendCollabRequest({
                    targetId: collabTargetArtist.id,
                    trackTitle: collabForm.trackTitle || undefined,
                    revenueShare: collabForm.revenueShare,
                    message: collabForm.message || undefined,
                    genre: collabForm.genre || undefined,
                  });
                  invalidateTracks();
                  setShowCollabRequestModal(false);
                  setCollabTargetArtist(null);
                  setCollabForm({
                    trackTitle: "",
                    revenueShare: 50,
                    message: "",
                    genre: "",
                  });
                } catch (err: any) {
                  console.error("Collab request failed:", err);
                }
              }}
            >
              <Users2 className="mr-2 h-4 w-4" />
              Envoyer la demande
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

import { useState, useEffect, useMemo } from "react";
/* webhint-disable hint-no-inline-styles */
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
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
} from "@/hooks/use-music";
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
  const [isLoggedIn, setIsLoggedIn] = useState(true);
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
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New Royalty Payment",
      description: "$1,234.56 has been deposited",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      title: "Track Approved",
      description: "Your track 'Summer Vibes' has been approved",
      time: "1 day ago",
      read: false,
    },
    {
      id: 3,
      title: "Collaboration Request",
      description: "@ProducerDJ wants to collaborate",
      time: "3 days ago",
      read: true,
    },
  ]);

  const { data: artists, isLoading: loadingArtists } = useMusicArtists();
  const { data: tracks, isLoading: loadingTracks } = useMusicTracks();
  const { data: analytics, isLoading: loadingAnalytics } = useMusicAnalytics();

  // Mock data for demonstration
  const mockArtists: Artist[] = [
    {
      id: "1",
      name: "Aurora Lights",
      stageName: "Aurora Lights",
      genre: "Electronic",
      totalStreams: 12345678,
      monthlyListeners: 543210,
      avatar: "/api/placeholder/80/80",
      status: "active",
      earnings: 45678.9,
      growth: 23.5,
      socialMedia: [
        { followers: 123456, platform: "Instagram" },
        { followers: 78901, platform: "Twitter" },
      ],
    },
    {
      id: "2",
      name: "Midnight Echo",
      stageName: "Midnight Echo",
      genre: "Hip Hop",
      totalStreams: 8765432,
      monthlyListeners: 321098,
      avatar: "/api/placeholder/80/80",
      status: "active",
      earnings: 32109.87,
      growth: 15.2,
      socialMedia: [
        { followers: 98765, platform: "Instagram" },
        { followers: 54321, platform: "TikTok" },
      ],
    },
    {
      id: "3",
      name: "Solar Flare",
      stageName: "Solar Flare",
      genre: "Rock",
      totalStreams: 5432109,
      monthlyListeners: 210987,
      avatar: "/api/placeholder/80/80",
      status: "active",
      earnings: 21098.76,
      growth: -5.3,
      socialMedia: [
        { followers: 65432, platform: "YouTube" },
        { followers: 32109, platform: "Facebook" },
      ],
    },
  ];

  const mockTracks: Track[] = [
    {
      id: "1",
      title: "Neon Dreams",
      artistId: "1",
      streams: 1234567,
      duration: 214,
      releaseDate: "2024-01-15",
      status: "published",
      revenue: 12345.67,
      platform: "Spotify",
      genre: "Electronic",
      mood: "Energetic",
      bpm: 128,
      key: "C# Minor",
    },
    {
      id: "2",
      title: "Midnight Drive",
      artistId: "2",
      streams: 987654,
      duration: 189,
      releaseDate: "2024-02-20",
      status: "published",
      revenue: 8765.43,
      platform: "Apple Music",
      genre: "Hip Hop",
      mood: "Chill",
      bpm: 95,
      key: "F Minor",
    },
    {
      id: "3",
      title: "Solar Winds",
      artistId: "3",
      streams: 654321,
      duration: 234,
      releaseDate: "2024-03-10",
      status: "published",
      revenue: 5432.1,
      platform: "YouTube Music",
      genre: "Rock",
      mood: "Epic",
      bpm: 140,
      key: "G Major",
    },
    {
      id: "4",
      title: "Urban Legends",
      artistId: "1",
      streams: 432109,
      duration: 198,
      releaseDate: "2024-04-05",
      status: "draft",
      revenue: 3210.98,
      platform: "SoundCloud",
      genre: "Electronic",
      mood: "Mysterious",
      bpm: 110,
      key: "A Minor",
    },
    {
      id: "5",
      title: "Cosmic Dance",
      artistId: "2",
      streams: 321098,
      duration: 176,
      releaseDate: "2024-05-12",
      status: "scheduled",
      revenue: 2109.87,
      platform: "Deezer",
      genre: "Hip Hop",
      mood: "Upbeat",
      bpm: 102,
      key: "D# Minor",
    },
  ];

  const mockAnalytics: Analytics = {
    totalStreams: 28765432,
    totalRevenue: 98765.43,
    monthlyGrowth: 12.5,
    topCountries: [
      { country: "United States", streams: 12345678 },
      { country: "United Kingdom", streams: 4321098 },
      { country: "Germany", streams: 3210987 },
      { country: "France", streams: 2109876 },
      { country: "Japan", streams: 1987654 },
    ],
    platformDistribution: [
      { platform: "Spotify", percentage: 45 },
      { platform: "Apple Music", percentage: 25 },
      { platform: "YouTube Music", percentage: 15 },
      { platform: "SoundCloud", percentage: 8 },
      { platform: "Other", percentage: 7 },
    ],
    dailyStreams: Array.from({ length: 30 }, (_, i) => ({
      date: `2024-06-${String(i + 1).padStart(2, "0")}`,
      streams: Math.floor(Math.random() * 50000) + 10000,
    })),
  };

  const mockRoyaltyPayments: RoyaltyPayment[] = [
    {
      id: "1",
      date: "2024-06-15",
      amount: 12345.67,
      status: "paid",
      description: "Q2 2024 Royalties",
      platform: "Spotify",
    },
    {
      id: "2",
      date: "2024-05-15",
      amount: 9876.54,
      status: "paid",
      description: "Q1 2024 Royalties",
      platform: "Apple Music",
    },
    {
      id: "3",
      date: "2024-07-15",
      amount: 15432.1,
      status: "pending",
      description: "Q3 2024 Royalties",
      platform: "All Platforms",
    },
    {
      id: "4",
      date: "2024-04-15",
      amount: 8765.43,
      status: "paid",
      description: "YouTube Music Royalties",
      platform: "YouTube",
    },
    {
      id: "5",
      date: "2024-08-15",
      amount: 0,
      status: "processing",
      description: "Q4 2024 Advance",
      platform: "Verso Air",
    },
  ];

  const mockCollaborations: Collaboration[] = [
    {
      id: "1",
      artist: "Midnight Echo",
      status: "active",
      track: "Neon Dreams (Remix)",
      revenueShare: 50,
      date: "2024-06-01",
    },
    {
      id: "2",
      artist: "Solar Flare",
      status: "pending",
      track: "Cosmic Collab",
      revenueShare: 30,
      date: "2024-06-15",
    },
    {
      id: "3",
      artist: "Ocean Waves",
      status: "completed",
      track: "Deep Blue",
      revenueShare: 40,
      date: "2024-05-20",
    },
    {
      id: "4",
      artist: "Mountain Peak",
      status: "active",
      track: "Summit Sound",
      revenueShare: 60,
      date: "2024-06-10",
    },
  ];

  const mockReleases: Release[] = [
    {
      id: "1",
      title: "Neon Dreams",
      type: "single",
      releaseDate: "2024-01-15",
      status: "released",
      streams: 1234567,
      revenue: 12345.67,
    },
    {
      id: "2",
      title: "Midnight Drive",
      type: "single",
      releaseDate: "2024-02-20",
      status: "released",
      streams: 987654,
      revenue: 8765.43,
    },
    {
      id: "3",
      title: "Cosmic Dance EP",
      type: "ep",
      releaseDate: "2024-03-25",
      status: "released",
      streams: 432109,
      revenue: 5432.1,
    },
    {
      id: "4",
      title: "Urban Legends",
      type: "single",
      releaseDate: "2024-07-01",
      status: "scheduled",
      streams: 0,
      revenue: 0,
    },
    {
      id: "5",
      title: "Solar System Album",
      type: "album",
      releaseDate: "2024-12-01",
      status: "draft",
      streams: 0,
      revenue: 0,
    },
  ];

  // Use mock data while loading
  const displayArtists = artists || mockArtists;
  const displayTracks = tracks || mockTracks;
  const displayAnalytics = analytics || mockAnalytics;
  const displayRoyalties = mockRoyaltyPayments;
  const displayCollaborations = mockCollaborations;
  const displayReleases = mockReleases;

  // Calculate totals
  const totalStreams = (displayAnalytics as any)?.totalStreams || 0;
  const totalArtists = displayArtists?.length || 0;
  const totalTracks = displayTracks?.length || 0;
  const totalRevenue = (displayAnalytics as any)?.totalRevenue || 0;
  const monthlyGrowth = (displayAnalytics as any)?.monthlyGrowth || 0;

  // Filter tracks based on search and genre
  const filteredTracks = useMemo(() => {
    return displayTracks.filter((track) => {
      const matchesSearch =
        searchQuery === "" ||
        track.title.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
        displayArtists
          .find((a) => a.id === track.artistId)
          ?.stageName.toLowerCase()
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

  const handlePlayTrack = (track: any) => {
    setCurrentTrack(track as Track);
    setIsPlaying(true);
  };

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

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Music className="mx-auto h-20 w-20 text-white mb-6" />
              <motion.h1
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="text-4xl font-bold text-white mb-4"
              >
                Verso Air ™️ Music Label
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.15 }}
                className="text-xl text-purple-200 mb-8"
              >
                Exclusive portal for certified artists
              </motion.p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">
                Artist Login
              </h2>
              <p className="text-purple-200 mb-6">
                This portal is exclusively for artists signed to Verso Air ™️
                Music Label. Only certified artists with active contracts can
                access this platform.
              </p>

              <div className="space-y-4 mb-6">
                <Input
                  type="email"
                  placeholder="Artist Email"
                  className="bg-white/20 border-white/30 text-white placeholder-purple-200"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  className="bg-white/20 border-white/30 text-white placeholder-purple-200"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch id="remember" />
                    <Label htmlFor="remember" className="text-purple-200">
                      Remember me
                    </Label>
                  </div>
                  <Button variant="link" className="text-purple-300">
                    Forgot password?
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setIsLoggedIn(true)}
                className="w-full mb-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-medium"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Login to Artist Portal
              </Button>

              <Separator className="my-6 bg-white/20" />

              <div className="grid grid-cols-2 gap-4 mb-6">
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Apple className="mr-2 h-4 w-4" />
                  Apple
                </Button>
              </div>

              <div className="border-t border-white/20 pt-6">
                <p className="text-purple-200 text-sm mb-4">
                  Not a certified artist yet? Interested in joining our label?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={() => window.open("/contracts", "_blank")}
                  >
                    <Award className="mr-2 h-4 w-4" />
                    View Contracts
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={() => window.open("/apply", "_blank")}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Apply Now
                  </Button>
                </div>
              </div>
            </div>

            <Link href="/">
              <Button
                variant="ghost"
                className="mt-6 text-purple-200 hover:text-white"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
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
                  <p className="text-sm text-purple-200 mb-1">Total Streams</p>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(totalStreams)}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">
                      +12.5% this month
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
                  <p className="text-sm text-purple-200 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(totalRevenue)}
                  </p>
                  <div className="flex items-center mt-2">
                    <DollarSign className="h-4 w-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">
                      +8.3% from last month
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
                    Monthly Listeners
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(543210)}
                  </p>
                  <div className="flex items-center mt-2">
                    <Users className="h-4 w-4 text-blue-400 mr-1" />
                    <span className="text-blue-400 text-sm">
                      +2,345 new listeners
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
                    Active Collaborations
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
                      3 pending requests
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
            <CardTitle className="text-white">Streams Overview</CardTitle>
            <CardDescription className="text-purple-200">
              Last 30 days performance
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                          style={{ height: `${(day.streams / 50000) * 100}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{formatNumber(day.streams)} streams</p>
                        <p className="text-xs">{day.date}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
            </div>
            <div className="mt-4 grid grid-cols-7 text-xs text-purple-200">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="text-center">
                  {day}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Platform Distribution</CardTitle>
            <CardDescription className="text-purple-200">
              Where your music is being streamed
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <CardTitle className="text-white">Recent Tracks</CardTitle>
              <CardDescription className="text-purple-200">
                Your latest releases
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="text-purple-200">
              View All
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
                          {artist?.stageName} •{" "}
                          {(track as any).genre || "Unknown"}
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
                        <p className="text-purple-200 text-sm">streams</p>
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
              <CardTitle className="text-white">Top Artists</CardTitle>
              <CardDescription className="text-purple-200">
                Label performance ranking
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" className="text-purple-200">
              View All
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
                        {artist.stageName?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-white font-medium">
                          {artist.stageName}
                        </p>
                        <Badge
                          variant="outline"
                          className="border-purple-400 text-purple-400 text-xs"
                        >
                          {artist.genre}
                        </Badge>
                      </div>
                      <p className="text-purple-200 text-sm">
                        {formatNumber((artist as any).totalStreams || 0)} total
                        streams
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
                    <p className="text-purple-200 text-sm">growth</p>
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
          <h2 className="text-2xl font-bold text-white">Music Library</h2>
          <p className="text-purple-200">
            Manage your tracks, albums, and releases
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleUploadTrack}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload New Track
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Create Album
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white/5 rounded-xl border border-white/20">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-purple-200" />
          <Input
            placeholder="Search tracks, albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-white placeholder-purple-200 w-full sm:w-64"
          />
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white">
              <SelectValue placeholder="Filter by genre" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/20">
              <SelectItem value="all">All Genres</SelectItem>
              <SelectItem value="Electronic">Electronic</SelectItem>
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
            return (
              <Card
                key={track.id}
                className="bg-white/5 backdrop-blur-md border-white/20 overflow-hidden group hover:bg-white/10 transition-all"
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music2 className="h-16 w-16 text-white/30" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <Button
                          onClick={() => handlePlayTrack(track)}
                          className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Play Now
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-semibold truncate">
                          {track.title}
                        </h3>
                        <p className="text-purple-200 text-sm truncate">
                          {artist?.stageName || "Unknown"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-purple-200"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-gray-900 border-white/20"
                        >
                          <DropdownMenuItem className="text-white">
                            <Play className="mr-2 h-4 w-4" />
                            Play
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-white">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-white">
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/20" />
                          <DropdownMenuItem className="text-red-400">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
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
                        <p className="text-purple-200 text-xs">streams</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-purple-200">
                      <div className="text-center">
                        <p className="font-medium text-white">
                          {(track as any).bpm || 120}
                        </p>
                        <p>BPM</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-white">
                          {(track as any).key || "C"}
                        </p>
                        <p>Key</p>
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
            return (
              <div
                key={track.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Music2 className="h-6 w-6 text-white" />
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
                      {artist?.stageName} • {(track as any).genre || "Unknown"}{" "}
                      • {(track as any).bpm || 120} BPM •{" "}
                      {(track as any).key || "C"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right hidden md:block">
                    <p className="text-white">
                      {formatCurrency((track as any).revenue || 0)}
                    </p>
                    <p className="text-purple-200 text-sm">revenue</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">
                      {formatNumber(
                        (track as any).streams || track.playCount || 0,
                      )}
                    </p>
                    <p className="text-purple-200 text-sm">streams</p>
                  </div>
                  <Badge
                    className={getStatusColor(
                      (track as any).status || "published",
                    )}
                  >
                    {(track as any).status || "published"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-purple-200"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-gray-900 border-white/20"
                    >
                      <DropdownMenuItem className="text-white">
                        <Play className="mr-2 h-4 w-4" />
                        Play
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-white">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-white">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
          <p className="text-purple-200">
            Detailed insights into your music performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 Days
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Geographic Distribution */}
        <Card className="lg:col-span-2 bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">
              Geographic Distribution
            </CardTitle>
            <CardDescription className="text-purple-200">
              Top countries by streams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-purple-200">Country</TableHead>
                  <TableHead className="text-purple-200">Streams</TableHead>
                  <TableHead className="text-purple-200">Percentage</TableHead>
                  <TableHead className="text-purple-200">Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((displayAnalytics as any)?.topCountries || []).map(
                  (country: any, i: number) => (
                    <TableRow key={i} className="border-white/10">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-purple-400" />
                          <span>{country.country}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">
                        {formatNumber(country.streams)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-24 bg-white/20 rounded-full h-2 mr-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                              style={{
                                width: `${
                                  (country.streams /
                                    (((displayAnalytics as any)?.topCountries ||
                                      [])[0]?.streams || 1)) *
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
                      <TableCell>
                        <div
                          className={`flex items-center ${
                            i % 3 === 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {i % 3 === 0 ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {i % 3 === 0 ? "+" : "-"}
                          {Math.floor(Math.random() * 15) + 5}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Audience Insights */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Audience Insights</CardTitle>
            <CardDescription className="text-purple-200">
              Your listener demographics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white text-sm">Age 18-24</span>
                <span className="text-purple-200 text-sm">42%</span>
              </div>
              <Progress value={42} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white text-sm">Age 25-34</span>
                <span className="text-purple-200 text-sm">35%</span>
              </div>
              <Progress value={35} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white text-sm">Age 35-44</span>
                <span className="text-purple-200 text-sm">15%</span>
              </div>
              <Progress value={15} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-white text-sm">Age 45+</span>
                <span className="text-purple-200 text-sm">8%</span>
              </div>
              <Progress value={8} className="h-2" />
            </div>
            <Separator className="bg-white/20" />
            <div className="pt-2">
              <p className="text-purple-200 text-sm mb-2">Top Cities</p>
              <div className="space-y-2">
                {["Los Angeles", "New York", "London", "Tokyo", "Berlin"].map(
                  (city, i) => (
                    <div key={city} className="flex justify-between">
                      <span className="text-white text-sm">{city}</span>
                      <span className="text-purple-200 text-sm">
                        {Math.floor(Math.random() * 20) + 5}%
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance */}
      <Card className="bg-white/5 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Platform Performance</CardTitle>
          <CardDescription className="text-purple-200">
            Revenue breakdown by platform
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                          <p className="text-sm text-purple-200">share</p>
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
        </CardContent>
      </Card>
    </div>
  );

  const renderRoyalties = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Royalties & Payments
          </h2>
          <p className="text-purple-200">
            Track your earnings and payment history
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Statement
          </Button>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Wallet className="mr-2 h-4 w-4" />
            Withdraw Funds
          </Button>
        </div>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-purple-200 mb-2">Available Balance</p>
              <p className="text-4xl font-bold text-white">
                {formatCurrency(15432.1)}
              </p>
              <p className="text-green-400 text-sm mt-2">
                +$2,345.67 this month
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-purple-200 mb-2">Pending Payments</p>
              <p className="text-4xl font-bold text-white">
                {formatCurrency(2345.67)}
              </p>
              <p className="text-yellow-400 text-sm mt-2">
                Processing - est. 7-10 days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-purple-200 mb-2">Total Earned</p>
              <p className="text-4xl font-bold text-white">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-blue-400 text-sm mt-2">All-time earnings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="bg-white/5 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Payment History</CardTitle>
          <CardDescription className="text-purple-200">
            Recent royalty payments and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/20">
                <TableHead className="text-purple-200">Date</TableHead>
                <TableHead className="text-purple-200">Description</TableHead>
                <TableHead className="text-purple-200">Platform</TableHead>
                <TableHead className="text-purple-200">Amount</TableHead>
                <TableHead className="text-purple-200">Status</TableHead>
                <TableHead className="text-purple-200">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRoyalties.map((payment) => (
                <TableRow key={payment.id} className="border-white/10">
                  <TableCell className="font-medium text-white">
                    {payment.date}
                  </TableCell>
                  <TableCell className="text-white">
                    {payment.description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-purple-400 text-purple-400"
                    >
                      {payment.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white font-medium">
                    {payment.amount > 0
                      ? formatCurrency(payment.amount)
                      : "Pending"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-purple-200"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-purple-200"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderCollaborations = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Collaborations</h2>
          <p className="text-purple-200">
            Connect and create with other artists
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Users2 className="mr-2 h-4 w-4" />
            Find Artists
          </Button>
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Plus className="mr-2 h-4 w-4" />
            New Collaboration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Collaborations */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Active Collaborations</CardTitle>
            <CardDescription className="text-purple-200">
              Projects you're currently working on
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayCollaborations
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
                            Active
                          </Badge>
                        </div>
                        <p className="text-purple-200 text-sm mb-2">
                          Track: {collab.track}
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-white">
                            Revenue Share:{" "}
                            <span className="font-medium">
                              {collab.revenueShare}%
                            </span>
                          </span>
                          <span className="text-purple-200">
                            Started: {collab.date}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-purple-200"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Collaboration Requests */}
        <Card className="bg-white/5 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Pending Requests</CardTitle>
            <CardDescription className="text-purple-200">
              Collaboration invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayCollaborations
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
                          Wants to collaborate on: {collab.track}
                        </p>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        Pending
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Check className="mr-2 h-3 w-3" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-400 text-red-400 hover:bg-red-400/10"
                      >
                        <X className="mr-2 h-3 w-3" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/20 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Music2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{currentTrack.title}</p>
                  <p className="text-purple-200 text-sm">
                    {
                      displayArtists.find((a) => a.id === currentTrack.artistId)
                        ?.stageName
                    }
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-purple-200 hover:text-white"
                  onClick={() => setIsPlaying(!isPlaying)}
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
                    <span className="text-purple-200 text-sm">0:00</span>
                    <ProgressBar percent={30} className="w-64 h-1" />
                    <span className="text-purple-200 text-sm">
                      {Math.floor((currentTrack.duration || 0) / 60)}:
                      {String((currentTrack.duration || 0) % 60).padStart(
                        2,
                        "0",
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-purple-200 hover:text-white"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-purple-200 hover:text-white"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-purple-200 hover:text-white"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
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

      {/* Cultural Navigation */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto text-sm">
          <Link href="/">
            <span className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer whitespace-nowrap">
              🏠 Accueil
            </span>
          </Link>
          <span className="text-purple-400/50">|</span>
          <Link href="/artisans">
            <span className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer whitespace-nowrap">
              🎨 Artisans
            </span>
          </Link>
          <Link href="/programs">
            <span className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer whitespace-nowrap">
              🎭 Programmes
            </span>
          </Link>
          <Link href="/communities">
            <span className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer whitespace-nowrap">
              👥 Communautés
            </span>
          </Link>
          <Link href="/divertissement">
            <span className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer whitespace-nowrap">
              🎪 Divertissement
            </span>
          </Link>
        </div>
      </div>

      {/* Artist Portal Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-8 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Music className="h-8 w-8 text-white" />
              <div>
                <span className="text-xl font-bold text-white">
                  Verso Air ™️ Artist Portal
                </span>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Pro Tier
                  </Badge>
                  <span className="text-purple-200 text-sm">
                    Welcome back, Aurora Lights
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
                    className="text-purple-200 hover:text-white"
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src="/api/placeholder/32/32" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        AL
                      </AvatarFallback>
                    </Avatar>
                    Aurora Lights
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-gray-900 border-white/20"
                >
                  <DropdownMenuLabel className="text-white">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem className="text-white">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem className="text-white">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Support
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400"
                    onClick={() => setIsLoggedIn(false)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4">
            <Tabs
              defaultValue="dashboard"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="bg-white/10 backdrop-blur-md border border-white/20">
                <TabsTrigger
                  value="dashboard"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="music"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <Music2 className="mr-2 h-4 w-4" />
                  Music
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="royalties"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Royalties
                </TabsTrigger>
                <TabsTrigger
                  value="collaborations"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <Users2 className="mr-2 h-4 w-4" />
                  Collaborations
                </TabsTrigger>
                <TabsTrigger
                  value="releases"
                  className="text-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Releases
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
              <p className="text-white text-lg">Loading artist data...</p>
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

            <TabsContent value="collaborations" className="space-y-6">
              {renderCollaborations()}
            </TabsContent>

            <TabsContent value="releases" className="space-y-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Release Schedule
                    </h2>
                    <p className="text-purple-200">
                      Plan and manage your upcoming releases
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowScheduleModal(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Release
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Upcoming Releases */}
                  <Card className="lg:col-span-2 bg-white/5 backdrop-blur-md border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Upcoming Releases
                      </CardTitle>
                      <CardDescription className="text-purple-200">
                        Scheduled and draft releases
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
                                  Release: {release.releaseDate} • Status:{" "}
                                  {release.status}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-medium">
                                {formatNumber(release.streams)}
                              </p>
                              <p className="text-purple-200 text-sm">streams</p>
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
                        Release Calendar
                      </CardTitle>
                      <CardDescription className="text-purple-200">
                        Upcoming release dates
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
                              Album Releases
                            </span>
                          </div>
                          <span className="text-purple-200 text-sm">2</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-pink-500" />
                            <span className="text-white text-sm">
                              EP Releases
                            </span>
                          </div>
                          <span className="text-purple-200 text-sm">1</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-white text-sm">
                              Single Releases
                            </span>
                          </div>
                          <span className="text-purple-200 text-sm">3</span>
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
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-[500px] bg-gray-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Upload New Track</DialogTitle>
            <DialogDescription className="text-purple-200">
              Upload your music to all major streaming platforms
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="track-title">Track Title</Label>
              <Input
                id="track-title"
                placeholder="Enter track title"
                className="bg-white/10 border-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select>
                <SelectTrigger className="bg-white/10 border-white/30">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="hip-hop">Hip Hop</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="r&b">R&B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Upload Files</Label>
              <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center">
                <UploadCloud className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                <p className="text-white mb-2">Drop your audio files here</p>
                <p className="text-purple-200 text-sm mb-4">
                  Supports: WAV, MP3, FLAC, AIFF
                </p>
                <Button
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Browse Files
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell us about this track..."
                className="bg-white/10 border-white/30 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Upload className="mr-2 h-4 w-4" />
              Upload Track
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Release Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-[500px] bg-gray-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Schedule Release</DialogTitle>
            <DialogDescription className="text-purple-200">
              Plan your next release across all platforms
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="release-type">Release Type</Label>
                <Select>
                  <SelectTrigger className="bg-white/10 border-white/30">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="ep">EP</SelectItem>
                    <SelectItem value="album">Album</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="release-date">Release Date</Label>
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
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
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
              <Label htmlFor="platforms">Platforms</Label>
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
                Marketing Budget (Optional)
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
              Cancel
            </Button>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Music,
  Users,
  Crown,
  MessageSquare,
  Building2,
  ArrowRight,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ChevronLeft,
  Sparkles,
  Shield,
  Globe,
  Star,
  Zap,
  Heart,
  BookOpen,
  Briefcase,
  Headphones,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SuccessCelebration from "@/components/SuccessCelebration";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePortalAccess } from "@/hooks/usePortalAccess";
import { UNLOCK_REASONS, type PortalId } from "@/lib/portal-access";

// ─────────────────────────────────────────────────────
// 🎯 Portal Definitions
// ─────────────────────────────────────────────────────
interface Portal {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  features: string[];
  registerEndpoint: string;
  loginEndpoint: string;
  redirectPath: string;
  tier?: string;
  badge?: string;
}

const PORTALS: Portal[] = [
  {
    id: "general",
    name: "General Account",
    description:
      "Access the full Verso Air platform — browse businesses, make reservations, and explore all services.",
    icon: Globe,
    color: "blue",
    gradient: "from-sky-500 to-cyan-500",
    cardRing: "ring-sky-400/40 border-sky-400/30",
    badge: "bg-sky-500/15 text-sky-200 border-sky-400/30",
    features: [
      "Browse business directory",
      "Make reservations",
      "Save favorites",
      "Leave reviews",
      "Access marketplace",
    ],
    registerEndpoint: "/auth/register",
    loginEndpoint: "/auth/login",
    redirectPath: "/dashboard",
    badge: "Free",
  },
  {
    id: "subscriber",
    name: "Premium Subscriber",
    description:
      "Unlock premium features — priority support, advanced analytics, and exclusive GeoAdmin tools.",
    icon: Crown,
    color: "amber",
    gradient: "from-amber-500 to-orange-500",
    cardRing: "ring-amber-400/40 border-amber-400/30",
    badge: "bg-amber-500/15 text-amber-100 border-amber-400/30",
    features: [
      "Priority customer support",
      "Advanced business analytics",
      "GeoAdmin dashboard access",
      "Premium badge & visibility",
      "Early access to features",
    ],
    registerEndpoint: "/auth/subscriber/register",
    loginEndpoint: "/auth/subscriber/login",
    redirectPath: "/geo-admin?welcome=new",
    tier: "essential",
    badge: "Premium",
  },
  {
    id: "community",
    name: "Artisans / Community",
    description:
      "Join the Verso Air community — write blog posts, connect with others, and share insights.",
    icon: MessageSquare,
    color: "green",
    gradient: "from-emerald-500 to-teal-500",
    cardRing: "ring-emerald-400/40 border-emerald-400/30",
    badge: "bg-emerald-500/15 text-emerald-100 border-emerald-400/30",
    features: [
      "Write & publish blog posts",
      "Comment & engage",
      "Build your network",
      "Community badges",
      "Featured writer opportunities",
    ],
    registerEndpoint: "/auth/community/register",
    loginEndpoint: "/auth/community/login",
    redirectPath: "/artisans-portal",
    badge: "Community",
  },
  {
    id: "business",
    name: "Business Owner",
    description:
      "List your business on Verso Air — manage your profile, respond to reviews, and grow your reach.",
    icon: Building2,
    color: "slate",
    gradient: "from-slate-600 to-slate-800",
    cardRing: "ring-slate-300/40 border-slate-300/30",
    badge: "bg-slate-200/10 text-slate-100 border-slate-300/20",
    features: [
      "Business listing & profile",
      "Respond to reviews",
      "Analytics dashboard",
      "Reservation management",
      "Advertising options",
    ],
    registerEndpoint: "/auth/register",
    loginEndpoint: "/auth/login",
    redirectPath: "/profile",
    badge: "Business",
  },
  {
    id: "contractor",
    name: "Contractor / Freelancer",
    description:
      "Join as a contractor — find projects, manage contracts, and connect with businesses seeking your skills.",
    icon: Briefcase,
    color: "orange",
    gradient: "from-orange-500 to-red-500",
    cardRing: "ring-orange-400/40 border-orange-400/30",
    badge: "bg-orange-500/15 text-orange-100 border-orange-400/30",
    features: [
      "Browse & apply to projects",
      "Contractor profile & portfolio",
      "Contract management",
      "Hourly rate & availability",
      "Direct business connections",
    ],
    registerEndpoint: "/auth/register",
    loginEndpoint: "/auth/login",
    redirectPath: "/services/contractors",
    badge: "Contractor",
  },
];

// Musical Universe portals — Artist + Streamer grouped together
const MUSICAL_PORTALS: Portal[] = [
  {
    id: "artist",
    name: "Artist / Music Label",
    description:
      "Join Verso Air™ Music Label — upload tracks, track royalties, and compete in StreamRoyale.",
    icon: Music,
    color: "purple",
    gradient: "from-violet-500 to-fuchsia-500",
    cardRing: "ring-violet-400/40 border-violet-400/30",
    badge: "bg-violet-500/15 text-violet-100 border-violet-400/30",
    features: [
      "Upload unlimited tracks",
      "Real-time streaming analytics",
      "StreamRoyale competition",
      "Royalty payouts",
      "Artist profile & badges",
    ],
    registerEndpoint: "/auth/artist/register",
    loginEndpoint: "/auth/artist/login",
    redirectPath: "/artist-portal",
    badge: "Creator",
  },
  {
    id: "streamer",
    name: "Streamer / Listener",
    description:
      "Stream music, play Arcade duels, follow artists, and enjoy the full Verso Air audio experience.",
    icon: Headphones,
    color: "fuchsia",
    gradient: "from-fuchsia-500 to-violet-600",
    cardRing: "ring-fuchsia-400/40 border-fuchsia-400/30",
    badge: "bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-400/30",
    features: [
      "Unlimited music streaming",
      "Arcade PvP duels — free access",
      "Follow & support artists",
      "Playlists & listening history",
      "Community interactions",
    ],
    registerEndpoint: "/auth/register",
    loginEndpoint: "/auth/login",
    redirectPath: "/stream",
    badge: "Free",
  },
];

const SUBSCRIPTION_TIERS = [
  {
    value: "essential",
    label: "Essential — $9.99/mo",
    description: "Basic premium features",
  },
  {
    value: "verified",
    label: "Verified — $19.99/mo",
    description: "Verified badge + analytics",
  },
  {
    value: "max",
    label: "Max — $49.99/mo",
    description: "Full feature access",
  },
  {
    value: "enterprise",
    label: "Enterprise — Custom",
    description: "White-glove support",
  },
];

// ─────────────────────────────────────────────────────
// 🔐 Map apply-page portal IDs → portal-access PortalIds
// ─────────────────────────────────────────────────────
const PORTAL_ACCESS_MAP: Record<string, PortalId> = {
  general: "general",
  artist: "artist",
  subscriber: "geo-admin",
  community: "community",
  streamer: "streamer",
  business: "general",
  contractor: "contractor",
};

export default function ApplyPage() {
  const [, setLocation] = useLocation();
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [musicUniverseOpen, setMusicUniverseOpen] = useState(false);

  // ── Auth-aware portal access ──
  const { user } = useAuthContext();
  const { access, isLoading: portalLoading } = usePortalAccess();

  // Track which fields the user has interacted with (for real-time validation)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    stageName: "",
    genre: "",
    country: "",
    tier: "essential",
    specialization: "",
    hourlyRate: "",
    phone: "",
  });

  // ─── Validation helpers ───────────────────────────────
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/;

  const validations = {
    email: formData.email.length > 0 && EMAIL_REGEX.test(formData.email),
    emailFormat:
      formData.email.length === 0 || EMAIL_REGEX.test(formData.email),
    passwordLength: formData.password.length >= 8,
    passwordUpper: /[A-Z]/.test(formData.password),
    passwordNumber: /[0-9]/.test(formData.password),
    passwordStrong:
      formData.password.length >= 8 &&
      /[A-Z]/.test(formData.password) &&
      /[0-9]/.test(formData.password),
    passwordsMatch:
      formData.confirmPassword.length === 0 ||
      formData.password === formData.confirmPassword,
    phone: formData.phone.length === 0 || PHONE_REGEX.test(formData.phone),
  };

  const passwordStrengthLevel = [
    validations.passwordLength,
    validations.passwordUpper,
    validations.passwordNumber,
  ].filter(Boolean).length; // 0-3

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleRegister = async () => {
    if (!selectedPortal) return;

    // Mark all fields as touched to show any remaining errors
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
      phone: true,
    });

    // Validation
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }
    if (!EMAIL_REGEX.test(formData.email)) {
      setError("Please enter a valid email address (e.g. name@example.com)");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError("Password must contain at least one number");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.phone && !PHONE_REGEX.test(formData.phone)) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Build request body based on portal type
      let body: Record<string, any> = {
        email: formData.email,
        password: formData.password,
        ...(formData.phone && { phone: formData.phone }),
      };

      if (selectedPortal.id === "artist") {
        body.stageName =
          formData.stageName ||
          formData.displayName ||
          formData.email.split("@")[0];
        body.legalName = formData.displayName;
        body.genre = formData.genre ? [formData.genre] : ["Pop"];
        body.country = formData.country || "United States";
      } else if (selectedPortal.id === "subscriber") {
        body.displayName = formData.displayName || formData.email.split("@")[0];
        body.tier = formData.tier;
      } else if (selectedPortal.id === "community") {
        body.displayName = formData.displayName || formData.email.split("@")[0];
      } else {
        // General / Business / Streamer / Contractor
        body.firstName = formData.displayName || formData.email.split("@")[0];
        if (selectedPortal.id === "streamer") {
          body.portals = ["general"];
        }
      }

      const response = await fetch(selectedPortal.registerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        // Store token if provided
        if (data.token) {
          const { setAuthToken } = await import("@/lib/auth");
          setAuthToken(data.token);
        }

        // If contractor portal, also create the contractor profile
        if (selectedPortal.id === "contractor" && data.token) {
          try {
            await fetch("/api/manage/contractors", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
              },
              credentials: "include",
              body: JSON.stringify({
                name: formData.displayName || formData.email.split("@")[0],
                email: formData.email,
                specialization: formData.specialization || "General",
                hourlyRate: formData.hourlyRate || null,
                isAvailable: true,
              }),
            });
          } catch {
            // Non-blocking — account was still created
          }
        }

        setSuccess(true);
        // Redirect after short delay
        setTimeout(() => {
          setLocation(selectedPortal.redirectPath);
        }, 1500);
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // 🔐 Authenticated Portal Selector — eligible / ineligible
  // ─────────────────────────────────────────────────────
  if (user && !selectedPortal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-white/70 hover:text-white mb-8"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-6">
              <Shield className="h-4 w-4" />
              Portal Access
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your Portals
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Welcome back,{" "}
              <span className="text-white font-medium">
                {user.name || user.username || user.email}
              </span>
              . Select an eligible portal below, or apply to unlock new ones.
            </p>
          </motion.div>

          {portalLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="ml-2 text-white/50 text-sm">
                Loading portal access…
              </span>
            </div>
          ) : (
            <>
              {/* ── Eligible portals ── */}
              {(() => {
                const eligible = PORTALS.filter((p) => {
                  const accessId = PORTAL_ACCESS_MAP[p.id];
                  return accessId ? access[accessId] : false;
                });
                const ineligible = PORTALS.filter((p) => {
                  const accessId = PORTAL_ACCESS_MAP[p.id];
                  return accessId ? !access[accessId] : true;
                });
                const eligibleMusic = MUSICAL_PORTALS.filter((p) => {
                  const accessId = PORTAL_ACCESS_MAP[p.id];
                  return accessId ? access[accessId] : false;
                });
                const ineligibleMusic = MUSICAL_PORTALS.filter((p) => {
                  const accessId = PORTAL_ACCESS_MAP[p.id];
                  return accessId ? !access[accessId] : true;
                });

                return (
                  <>
                    {eligible.length > 0 && (
                      <>
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                          Eligible Portals
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[95vw] mx-auto mb-10">
                          {eligible.map((portal, index) => (
                            <motion.div
                              key={portal.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.08 }}
                            >
                              <Card
                                className={`relative overflow-hidden bg-white/5 hover:border-white/30 transition-all duration-300 cursor-pointer group h-full ring-1 ${portal.cardRing || "ring-amber-500/30 border-white/10"} border`}
                                onClick={() => setLocation(portal.redirectPath)}
                              >
                                {/* Gold connected indicator */}
                                <div className="absolute top-3 right-3 z-10">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${portal.badge || "bg-amber-500/15 text-amber-100 border-amber-400/30"} shadow-lg shadow-white/5`}>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Connected
                                  </span>
                                </div>
                                <div
                                  className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}
                                />
                                <CardHeader>
                                  <div className="flex items-start justify-between mb-2">
                                    <div
                                      className={`p-3 rounded-xl bg-gradient-to-br ${portal.gradient}`}
                                    >
                                      <portal.icon className="h-6 w-6 text-white" />
                                    </div>
                                    {/* Badge already replaced by gold Connected indicator above */}
                                  </div>
                                  <CardTitle className="text-white text-xl">
                                    {portal.name}
                                  </CardTitle>
                                  <CardDescription className="text-white/60">
                                    {portal.description}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <Button
                                    className={`w-full bg-gradient-to-r ${portal.gradient} hover:opacity-90 text-white`}
                                  >
                                    Enter Portal
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                  </Button>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* ── Musical Universe (auth'd) ── */}
                    <div className="max-w-[95vw] mx-auto mb-10">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Card
                          className={`relative overflow-hidden border-violet-400/20 transition-all duration-500 cursor-pointer group ${
                            musicUniverseOpen
                              ? "bg-gradient-to-br from-violet-950/50 via-fuchsia-950/40 to-purple-950/50 border-violet-400/30"
                              : "bg-white/5 hover:border-violet-400/40"
                          }`}
                          onClick={() =>
                            !musicUniverseOpen && setMusicUniverseOpen(true)
                          }
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-10 transition-opacity" />

                          <CardHeader>
                            <div className="flex items-start justify-between mb-2">
                              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                                <Music className="h-6 w-6 text-white" />
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-purple-500/20 text-purple-300 border-purple-500/30"
                              >
                                🎵{" "}
                                {eligibleMusic.length > 0
                                  ? `${eligibleMusic.length} Accessible`
                                  : "2 Portals"}
                              </Badge>
                            </div>
                            <CardTitle className="text-white text-xl flex items-center gap-2">
                              MUSICAL UNIVERSE
                              <Sparkles className="h-4 w-4 text-purple-400" />
                            </CardTitle>
                            <CardDescription className="text-white/60">
                              {musicUniverseOpen
                                ? "Choose your path — create music or enjoy the experience."
                                : "Enter the music realm — Artists & Streamers unite here."}
                            </CardDescription>
                          </CardHeader>

                          {!musicUniverseOpen && (
                            <CardContent>
                              <Button className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90 text-white">
                                Enter Musical Universe
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                            </CardContent>
                          )}

                          {musicUniverseOpen && (
                            <CardContent>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                              >
                                {MUSICAL_PORTALS.map((portal, index) => {
                                  const accessId = PORTAL_ACCESS_MAP[portal.id];
                                  const isEligible = accessId
                                    ? access[accessId]
                                    : false;

                                  return (
                                    <motion.div
                                      key={portal.id}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: index * 0.15 + 0.2 }}
                                    >
                                      <Card
                                        className={`relative overflow-hidden transition-all duration-300 h-full ${
                                          isEligible
                                            ? "bg-white/5 border-white/10 hover:border-white/30 cursor-pointer group"
                                            : "bg-white/[0.02] border-white/5 opacity-60"
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isEligible) {
                                            setLocation(portal.redirectPath);
                                          }
                                        }}
                                      >
                                        <div
                                          className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} opacity-0 ${isEligible ? "group-hover:opacity-10" : ""} transition-opacity`}
                                        />
                                        <CardHeader>
                                          <div className="flex items-start justify-between mb-2">
                                            <div
                                              className={`p-3 rounded-xl bg-gradient-to-br ${isEligible ? portal.gradient : "from-white/5 to-white/10"}`}
                                            >
                                              <portal.icon
                                                className={`h-6 w-6 ${isEligible ? "text-white" : "text-white/30"}`}
                                              />
                                            </div>
                                            {isEligible ? (
                                              portal.badge && (
                                                <Badge
                                                  variant="secondary"
                                                  className="bg-white/10 text-white/80"
                                                >
                                                  {portal.badge}
                                                </Badge>
                                              )
                                            ) : (
                                              <span className="flex items-center gap-1 text-[10px] font-medium text-white/30 px-2 py-0.5 rounded-full border border-white/10">
                                                <Lock className="w-3 h-3" />
                                                Locked
                                              </span>
                                            )}
                                          </div>
                                          <CardTitle
                                            className={`text-lg ${isEligible ? "text-white" : "text-white/40"}`}
                                          >
                                            {portal.name}
                                          </CardTitle>
                                          <CardDescription
                                            className={`text-sm ${isEligible ? "text-white/60" : "text-white/25"}`}
                                          >
                                            {portal.description}
                                          </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          {isEligible ? (
                                            <Button
                                              className={`w-full bg-gradient-to-r ${portal.gradient} hover:opacity-90 text-white`}
                                            >
                                              Enter Portal
                                              <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>
                                          ) : (
                                            <Button
                                              variant="outline"
                                              className="w-full border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPortal(portal);
                                              }}
                                            >
                                              Apply for Access
                                              <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>
                                          )}
                                        </CardContent>
                                      </Card>
                                    </motion.div>
                                  );
                                })}
                              </motion.div>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-4 text-white/40 hover:text-white/70 w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMusicUniverseOpen(false);
                                }}
                              >
                                <ChevronLeft className="h-3 w-3 mr-1" />
                                Collapse
                              </Button>
                            </CardContent>
                          )}
                        </Card>
                      </motion.div>
                    </div>

                    {/* ── Ineligible portals (greyed out) ── */}
                    {ineligible.length > 0 && (
                      <>
                        <h2 className="text-lg font-semibold text-white/40 mb-4 flex items-center gap-2 mt-4">
                          <Lock className="h-5 w-5 text-white/30" />
                          Available to Unlock
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[95vw] mx-auto">
                          {ineligible.map((portal, index) => {
                            const accessId = PORTAL_ACCESS_MAP[portal.id];
                            const reason = accessId
                              ? UNLOCK_REASONS[accessId] || portal.description
                              : portal.description;
                            return (
                              <motion.div
                                key={portal.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08 + 0.3 }}
                              >
                                <Card className="relative overflow-hidden bg-white/[0.02] border-white/5 transition-all duration-300 cursor-not-allowed h-full opacity-50">
                                  <CardHeader>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="p-3 rounded-xl bg-white/[0.06]">
                                        <portal.icon className="h-6 w-6 text-white/30" />
                                      </div>
                                      <span className="flex items-center gap-1 text-[10px] font-medium text-white/30 px-2 py-0.5 rounded-full border border-white/10">
                                        <Lock className="w-3 h-3" />
                                        Locked
                                      </span>
                                    </div>
                                    <CardTitle className="text-white/40 text-xl">
                                      {portal.name}
                                    </CardTitle>
                                    <CardDescription className="text-white/25">
                                      {reason}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <Button
                                      variant="outline"
                                      className="w-full border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Allow applying for locked portals
                                        setSelectedPortal(portal);
                                      }}
                                    >
                                      Apply for Access
                                      <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {/* Sign out hint */}
          <div className="text-center mt-12">
            <p className="text-white/40 text-sm">
              Not you?{" "}
              <Link
                href="/auth/signin?mode=login"
                className="text-white/60 hover:text-white underline"
              >
                Sign in as someone else
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // 🎨 Portal Selection View (unauthenticated)
  // ─────────────────────────────────────────────────────
  if (!selectedPortal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-white/70 hover:text-white mb-8"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-6">
              <Sparkles className="h-4 w-4" />
              Choose Your Path
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Join Verso Air™
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Select the account type that best fits your needs. Each portal
              provides specialized features for your journey.
            </p>
          </motion.div>

          {/* Portal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[95vw] mx-auto">
            {PORTALS.map((portal, index) => (
              <motion.div
                key={portal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`relative overflow-hidden bg-white/5 hover:border-white/30 transition-all duration-300 cursor-pointer group h-full border ring-1 ${portal.cardRing || "ring-white/10 border-white/10"}`}
                  onClick={() => {
                    if (portal.id === "business") {
                      setLocation("/auth/signin");
                    } else {
                      setSelectedPortal(portal);
                    }
                  }}
                >
                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}
                  />

                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className={`p-3 rounded-xl bg-gradient-to-br ${portal.gradient}`}
                      >
                        <portal.icon className="h-6 w-6 text-white" />
                      </div>
                      {portal.badge && (
                        <Badge
                          variant="secondary"
                          className={portal.badge}
                        >
                          {portal.badge.includes("bg-") ? "" : portal.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-white text-xl">
                      {portal.name}
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      <span
                        dangerouslySetInnerHTML={{
                          __html: portal.description
                            .replace(
                              /StreamRoyale/g,
                              '<span class="notranslate">StreamRoyale</span>',
                            )
                            .replace(
                              /Marketplace/g,
                              '<span class="notranslate">Marketplace</span>',
                            )
                            .replace(
                              /GeoAdmin/g,
                              '<span class="notranslate">GeoAdmin</span>',
                            )
                            .replace(
                              /Verso Air™/g,
                              '<span class="notranslate">Verso Air™</span>',
                            )
                            .replace(
                              /Verso Air/g,
                              '<span class="notranslate">Verso Air</span>',
                            ),
                        }}
                      />
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {portal.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-white/70"
                        >
                          <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <span
                            dangerouslySetInnerHTML={{
                              __html: feature
                                .replace(
                                  /StreamRoyale/g,
                                  '<span class="notranslate">StreamRoyale</span>',
                                )
                                .replace(
                                  /Marketplace/g,
                                  '<span class="notranslate">Marketplace</span>',
                                )
                                .replace(
                                  /GeoAdmin/g,
                                  '<span class="notranslate">GeoAdmin</span>',
                                )
                                .replace(
                                  /Verso Air/g,
                                  '<span class="notranslate">Verso Air</span>',
                                ),
                            }}
                          />
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full bg-gradient-to-r ${portal.gradient} hover:opacity-90 text-white`}
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* ── Musical Universe Revealing Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: PORTALS.length * 0.1 }}
              className={musicUniverseOpen ? "md:col-span-2 lg:col-span-3" : ""}
            >
              <Card
                className={`relative overflow-hidden border-white/10 transition-all duration-500 cursor-pointer group h-full ${
                  musicUniverseOpen
                    ? "bg-gradient-to-br from-purple-900/40 via-fuchsia-900/30 to-purple-900/40 border-purple-500/30"
                    : "bg-white/5 hover:border-purple-400/40"
                }`}
                onClick={() => !musicUniverseOpen && setMusicUniverseOpen(true)}
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-10 transition-opacity" />

                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600">
                      <Music className="h-6 w-6 text-white" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-purple-500/20 text-purple-300 border-purple-500/30"
                    >
                      🎵 2 Portals
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    MUSICAL UNIVERSE
                    <Sparkles className="h-4 w-4 text-purple-400" />
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    {musicUniverseOpen
                      ? "Choose your path — create music or enjoy the experience."
                      : "Enter the music realm — Artists & Streamers unite here."}
                  </CardDescription>
                </CardHeader>

                {!musicUniverseOpen && (
                  <CardContent>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90 text-white">
                      Enter Musical Universe
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                )}

                {/* Revealed sub-portals */}
                {musicUniverseOpen && (
                  <CardContent>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      {MUSICAL_PORTALS.map((portal, index) => (
                        <motion.div
                          key={portal.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.15 + 0.2 }}
                        >
                          <Card
                            className="relative overflow-hidden bg-white/5 border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer group h-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPortal(portal);
                            }}
                          >
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${portal.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}
                            />
                            <CardHeader>
                              <div className="flex items-start justify-between mb-2">
                                <div
                                  className={`p-3 rounded-xl bg-gradient-to-br ${portal.gradient}`}
                                >
                                  <portal.icon className="h-6 w-6 text-white" />
                                </div>
                                {portal.badge && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-white/10 text-white/80"
                                  >
                                    {portal.badge}
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-white text-lg">
                                {portal.name}
                              </CardTitle>
                              <CardDescription className="text-white/60 text-sm">
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: portal.description
                                      .replace(
                                        /StreamRoyale/g,
                                        '<span class="notranslate">StreamRoyale</span>',
                                      )
                                      .replace(
                                        /Verso Air™/g,
                                        '<span class="notranslate">Verso Air™</span>',
                                      )
                                      .replace(
                                        /Verso Air/g,
                                        '<span class="notranslate">Verso Air</span>',
                                      ),
                                  }}
                                />
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-1.5 mb-4">
                                {portal.features.map((feature, i) => (
                                  <li
                                    key={i}
                                    className="flex items-center gap-2 text-sm text-white/70"
                                  >
                                    <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: feature
                                          .replace(
                                            /StreamRoyale/g,
                                            '<span class="notranslate">StreamRoyale</span>',
                                          )
                                          .replace(
                                            /Verso Air/g,
                                            '<span class="notranslate">Verso Air</span>',
                                          ),
                                      }}
                                    />
                                  </li>
                                ))}
                              </ul>
                              <Button
                                className={`w-full bg-gradient-to-r ${portal.gradient} hover:opacity-90 text-white`}
                              >
                                Get Started
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 text-white/40 hover:text-white/70 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMusicUniverseOpen(false);
                      }}
                    >
                      <ChevronLeft className="h-3 w-3 mr-1" />
                      Collapse
                    </Button>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          </div>

          {/* Already have an account? */}
          <div className="text-center mt-12">
            <p className="text-white/60 mb-4">Already have an account?</p>
            <Link href="/auth/signin?mode=login">
              <Button
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // 📝 Registration Form View
  // ─────────────────────────────────────────────────────

  // 🎉 Show celebration overlay on success
  if (success && selectedPortal) {
    return (
      <SuccessCelebration
        portal={selectedPortal}
        userName={
          formData.displayName ||
          formData.stageName ||
          formData.email.split("@")[0]
        }
        onComplete={() => setLocation(selectedPortal.redirectPath)}
        countdownSeconds={8}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white mb-6"
          onClick={() => {
            setSelectedPortal(null);
            setError("");
            setSuccess(false);
            setTouched({});
          }}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Choose Different Portal
        </Button>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div
              className={`mx-auto p-4 rounded-2xl bg-gradient-to-br ${selectedPortal.gradient} w-fit mb-4`}
            >
              <selectedPortal.icon className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">
              {selectedPortal.name}
            </CardTitle>
            <CardDescription className="text-white/60">
              Create your account to get started
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Display Name (all portals) */}
            <div className="space-y-2">
              <Label className="text-white/80">
                {selectedPortal.id === "artist" ? "Legal Name" : "Display Name"}
              </Label>
              <Input
                placeholder={
                  selectedPortal.id === "artist"
                    ? "Your legal name"
                    : "How you want to be known"
                }
                value={formData.displayName}
                onChange={(e) =>
                  handleInputChange("displayName", e.target.value)
                }
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            {/* Artist-specific fields */}
            {selectedPortal.id === "artist" && (
              <>
                <div className="space-y-2">
                  <Label className="text-white/80">Stage Name</Label>
                  <Input
                    placeholder="Your artist name"
                    value={formData.stageName}
                    onChange={(e) =>
                      handleInputChange("stageName", e.target.value)
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Genre</Label>
                    <Select
                      value={formData.genre}
                      onValueChange={(v) => handleInputChange("genre", v)}
                    >
                      <SelectTrigger
                        className="bg-white/10 border-white/20 text-white"
                        translate="no"
                      >
                        <SelectValue placeholder="Select genre">
                          {formData.genre || undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Pop",
                          "Hip-Hop",
                          "R&B",
                          "Rock",
                          "Electronic",
                          "Jazz",
                          "Classical",
                          "Afrobeats",
                          "Reggae",
                          "Latin",
                          "Country",
                          "Other",
                        ].map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Country</Label>
                    <Input
                      placeholder="Your country"
                      value={formData.country}
                      onChange={(e) =>
                        handleInputChange("country", e.target.value)
                      }
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Subscriber tier selection */}
            {selectedPortal.id === "subscriber" && (
              <div className="space-y-2">
                <Label className="text-white/80">Subscription Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(v) => handleInputChange("tier", v)}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_TIERS.map((tier) => (
                      <SelectItem key={tier.value} value={tier.value}>
                        <div>
                          <div className="font-medium">{tier.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {tier.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Contractor-specific fields */}
            {selectedPortal.id === "contractor" && (
              <>
                <div className="space-y-2">
                  <Label className="text-white/80">Specialization</Label>
                  <Select
                    value={formData.specialization}
                    onValueChange={(v) =>
                      handleInputChange("specialization", v)
                    }
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select your field" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "General Construction",
                        "Electrical",
                        "Plumbing",
                        "HVAC",
                        "Carpentry",
                        "Painting",
                        "Roofing",
                        "Landscaping",
                        "Web Development",
                        "Graphic Design",
                        "Marketing",
                        "Consulting",
                        "IT Services",
                        "Photography",
                        "Catering",
                        "Cleaning",
                        "Other",
                      ].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Hourly Rate (USD)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 45"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      handleInputChange("hourlyRate", e.target.value)
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-white/80">Email *</Label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={`bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-10 ${
                    touched.email && !validations.emailFormat
                      ? "border-red-500/70 focus:border-red-500"
                      : touched.email && validations.email
                        ? "border-green-500/70"
                        : ""
                  }`}
                />
                {touched.email && formData.email.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validations.email ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                )}
              </div>
              {touched.email && !validations.emailFormat && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Enter a valid email (e.g. name@example.com)
                </p>
              )}
            </div>

            {/* Phone (optional) */}
            <div className="space-y-2">
              <Label className="text-white/80">
                Phone
                <span className="text-white/40 text-xs ml-1">(optional)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  className={`bg-white/10 border-white/20 text-white placeholder:text-white/40 pl-10 ${
                    touched.phone &&
                    formData.phone.length > 0 &&
                    !validations.phone
                      ? "border-red-500/70 focus:border-red-500"
                      : touched.phone &&
                          formData.phone.length > 0 &&
                          validations.phone
                        ? "border-green-500/70"
                        : ""
                  }`}
                />
              </div>
              {touched.phone &&
                formData.phone.length > 0 &&
                !validations.phone && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Enter a valid phone number (e.g. +1 555 123 4567)
                  </p>
                )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-white/80">Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, uppercase + number"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  onBlur={() => handleBlur("password")}
                  className={`bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-10 ${
                    touched.password &&
                    formData.password.length > 0 &&
                    !validations.passwordStrong
                      ? "border-amber-500/70"
                      : touched.password && validations.passwordStrong
                        ? "border-green-500/70"
                        : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Password strength bar */}
              {formData.password.length > 0 && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrengthLevel >= level
                            ? passwordStrengthLevel === 1
                              ? "bg-red-400"
                              : passwordStrengthLevel === 2
                                ? "bg-amber-400"
                                : "bg-green-400"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <p
                      className={`text-xs flex items-center gap-1 ${validations.passwordLength ? "text-green-400" : "text-white/40"}`}
                    >
                      {validations.passwordLength ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      At least 8 characters
                    </p>
                    <p
                      className={`text-xs flex items-center gap-1 ${validations.passwordUpper ? "text-green-400" : "text-white/40"}`}
                    >
                      {validations.passwordUpper ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      One uppercase letter (A–Z)
                    </p>
                    <p
                      className={`text-xs flex items-center gap-1 ${validations.passwordNumber ? "text-green-400" : "text-white/40"}`}
                    >
                      {validations.passwordNumber ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      One number (0–9)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label className="text-white/80">Confirm Password *</Label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  onBlur={() => handleBlur("confirmPassword")}
                  className={`bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-10 ${
                    touched.confirmPassword &&
                    formData.confirmPassword.length > 0 &&
                    !validations.passwordsMatch
                      ? "border-red-500/70 focus:border-red-500"
                      : touched.confirmPassword &&
                          formData.confirmPassword.length > 0 &&
                          validations.passwordsMatch
                        ? "border-green-500/70"
                        : ""
                  }`}
                />
                {formData.confirmPassword.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validations.passwordsMatch ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                )}
              </div>
              {touched.confirmPassword && !validations.passwordsMatch && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleRegister}
              translate="no"
              disabled={
                loading ||
                !formData.email ||
                !formData.password ||
                !validations.email ||
                !validations.passwordStrong ||
                !validations.passwordsMatch ||
                formData.confirmPassword.length === 0
              }
              className={`w-full bg-gradient-to-r ${selectedPortal.gradient} hover:opacity-90 text-white mt-6 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="notranslate">Creating Account...</span>
                </>
              ) : (
                <>
                  <span className="notranslate">Create Account</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            {/* Login link */}
            <p className="text-center text-white/60 text-sm">
              Already have an account?{" "}
              <Link
                href={
                  selectedPortal.id === "artist"
                    ? "/artist-portal"
                    : "/auth/signin?mode=login"
                }
                className="text-white hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

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
    gradient: "from-blue-500 to-cyan-500",
    features: [
      "Browse business directory",
      "Make reservations",
      "Save favorites",
      "Leave reviews",
      "Access marketplace",
    ],
    registerEndpoint: "/auth/register",
    loginEndpoint: "/auth/login",
    redirectPath: "/",
    badge: "Free",
  },
  {
    id: "artist",
    name: "Artist / Music Label",
    description:
      "Join Verso Air™ Music Label — upload tracks, track royalties, and compete in StreamRoyale.",
    icon: Music,
    color: "purple",
    gradient: "from-purple-500 to-pink-500",
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
    id: "subscriber",
    name: "Premium Subscriber",
    description:
      "Unlock premium features — priority support, advanced analytics, and exclusive GeoAdmin tools.",
    icon: Crown,
    color: "amber",
    gradient: "from-amber-500 to-orange-500",
    features: [
      "Priority customer support",
      "Advanced business analytics",
      "GeoAdmin dashboard access",
      "Premium badge & visibility",
      "Early access to features",
    ],
    registerEndpoint: "/auth/subscriber/register",
    loginEndpoint: "/auth/subscriber/login",
    redirectPath: "/geo-admin",
    tier: "essential",
    badge: "Premium",
  },
  {
    id: "community",
    name: "Community / Blog",
    description:
      "Join the Verso Air community — write blog posts, connect with others, and share insights.",
    icon: MessageSquare,
    color: "green",
    gradient: "from-green-500 to-emerald-500",
    features: [
      "Write & publish blog posts",
      "Comment & engage",
      "Build your network",
      "Community badges",
      "Featured writer opportunities",
    ],
    registerEndpoint: "/auth/community/register",
    loginEndpoint: "/auth/community/login",
    redirectPath: "/blog",
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

export default function ApplyPage() {
  const [, setLocation] = useLocation();
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleRegister = async () => {
    if (!selectedPortal) return;

    // Validation
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Build request body based on portal type
      let body: Record<string, any> = {
        email: formData.email,
        password: formData.password,
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
        // General / Business
        body.firstName = formData.displayName || formData.email.split("@")[0];
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
  // 🎨 Portal Selection View
  // ─────────────────────────────────────────────────────
  if (!selectedPortal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="container mx-auto px-4 py-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white mb-8"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {PORTALS.map((portal, index) => (
              <motion.div
                key={portal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="relative overflow-hidden bg-white/5 border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer group h-full"
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
                          className="bg-white/10 text-white/80"
                        >
                          {portal.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-white text-xl">
                      {portal.name}
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      {portal.description}
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
                          {feature}
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
          </div>

          {/* Already have an account? */}
          <div className="text-center mt-12">
            <p className="text-white/60 mb-4">Already have an account?</p>
            <Link href="/auth/signin?mode=login">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
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
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Account Created!
                </h3>
                <p className="text-white/60">
                  Redirecting you to your portal...
                </p>
              </motion.div>
            ) : (
              <>
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {/* Display Name (all portals) */}
                <div className="space-y-2">
                  <Label className="text-white/80">
                    {selectedPortal.id === "artist"
                      ? "Legal Name"
                      : "Display Name"}
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
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select genre" />
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

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-white/80">Email</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label className="text-white/80">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-10"
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
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label className="text-white/80">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleRegister}
                  disabled={loading}
                  className={`w-full bg-gradient-to-r ${selectedPortal.gradient} hover:opacity-90 text-white mt-6`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
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
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useSubscription } from "@/hooks/use-subscription";
import GeoAdminAuthGate from "@/components/GeoAdminAuthGate";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Plus,
  Search,
  Filter,
  Star,
  MapPin,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Crown,
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  MessageCircle,
  Shield,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  X,
  BadgeCheck,
  Clock,
  Heart,
  BarChart3,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ScrollToTop from "@/components/ScrollToTop";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Property {
  id: number;
  name: string;
  description: string;
  type: string;
  category: string;
  location: string;
  city: string;
  address: string;
  image: string;
  images: string[];
  price: string;
  rating: string;
  reviews: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  guests: number;
  amenities: string[];
  verified: boolean;
  instantBook: boolean;
  freeCancellation: boolean;
  discount: number;
  featured: boolean;
  tags: string[];
  hostName: string;
  hostPhone: string;
  hostEmail: string;
  superhost: boolean;
  responseRate: number;
  responseTime: string;
}

interface NewListing {
  name: string;
  description: string;
  type: string;
  category: string;
  city: string;
  location: string;
  address: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  amenities: string;
  hostPhone: string;
}

type PortalTab = "dashboard" | "listings" | "add" | "inquiries";

const ivoryCoastCities = [
  "Abidjan",
  "Yamoussoukro",
  "Bouaké",
  "San-Pédro",
  "Daloa",
  "Korhogo",
  "Man",
  "Gagnoa",
  "Divo",
  "Abengourou",
  "Grand-Bassam",
  "Assinie",
  "Bingerville",
  "Cocody",
  "Plateau",
  "Marcory",
  "Yopougon",
  "Treichville",
  "Adjamé",
  "Abobo",
];

const propertyTypes = [
  {
    value: "house",
    label: "🏠 Maison / House",
    description: "Villa, maison individuelle",
  },
  {
    value: "apartment",
    label: "🏢 Appartement",
    description: "Appartement en immeuble",
  },
  {
    value: "land",
    label: "🌍 Terrain / Land",
    description: "Terrain à bâtir, parcelle",
  },
  {
    value: "studio",
    label: "🏨 Studio / Chambre",
    description: "Studio, chambre meublée",
  },
  {
    value: "commercial",
    label: "🏪 Commercial",
    description: "Bureau, boutique, magasin",
  },
  {
    value: "villa",
    label: "🏖️ Villa de luxe",
    description: "Villa haut standing",
  },
];

const categoryOptions = [
  { value: "sale", label: "💰 Vente / For Sale" },
  { value: "rent", label: "🔑 Location / For Rent" },
  { value: "short-rent", label: "📅 Location courte durée" },
  { value: "lease", label: "📜 Bail commercial" },
];

const emptyListing: NewListing = {
  name: "",
  description: "",
  type: "",
  category: "",
  city: "",
  location: "",
  address: "",
  price: "",
  bedrooms: "0",
  bathrooms: "0",
  area: "",
  amenities: "",
  hostPhone: "",
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ImmobilierPortal() {
  const { isAuthenticated, loading, tier, tierName, user, refetch } =
    useSubscription();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<PortalTab>("dashboard");
  const [myListings, setMyListings] = useState<Property[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [newListing, setNewListing] = useState<NewListing>(emptyListing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [gateBypass, setGateBypass] = useState(() => {
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("authToken");
    return !!token;
  });

  // Auth session persistence
  useEffect(() => {
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("authToken");
    if (token && !gateBypass) setGateBypass(true);
  }, [gateBypass]);

  const handleSignInSuccess = async (username?: string) => {
    if (username) localStorage.setItem("geoadmin_username", username);
    setGateBypass(true);
    await new Promise((r) => setTimeout(r, 500));
    refetch();
  };

  // Fetch user's listings
  const fetchMyListings = useCallback(async () => {
    setIsLoadingListings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/properties?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMyListings(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    }
    setIsLoadingListings(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated || gateBypass) fetchMyListings();
  }, [isAuthenticated, gateBypass, fetchMyListings]);

  // Handle new listing submission
  const handleSubmitListing = async () => {
    if (
      !newListing.name ||
      !newListing.type ||
      !newListing.city ||
      !newListing.price
    )
      return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newListing.name,
          description: newListing.description,
          type: newListing.type,
          category: newListing.category || "rent",
          city: newListing.city,
          location: newListing.location || newListing.city,
          address: newListing.address,
          price: newListing.price,
          bedrooms: parseInt(newListing.bedrooms) || 0,
          bathrooms: parseInt(newListing.bathrooms) || 0,
          area: parseInt(newListing.area) || 0,
          amenities: newListing.amenities
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          hostName: user?.name || user?.username || "Owner",
          hostPhone: newListing.hostPhone,
          hostEmail: user?.email || "",
        }),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setNewListing(emptyListing);
        fetchMyListings();
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab("listings");
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to submit listing:", err);
    }
    setIsSubmitting(false);
  };

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Vérification de l'accès…</p>
        </div>
      </div>
    );
  }

  // ─── Auth Gate ──────────────────────────────────────────────────────────────

  if (!isAuthenticated && !gateBypass) {
    return <GeoAdminAuthGate onSignInSuccess={handleSignInSuccess} />;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalListings = myListings.length;
  const avgRating =
    myListings.length > 0
      ? (
          myListings.reduce((sum, p) => sum + Number(p.rating || 0), 0) /
          myListings.length
        ).toFixed(1)
      : "0.0";
  const totalRevenue = myListings.reduce(
    (sum, p) => sum + Number(p.price || 0),
    0,
  );
  const verifiedCount = myListings.filter((p) => p.verified).length;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 text-white">
      {/* ─── Premium Header ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-600/10 to-amber-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.1),transparent_50%)]" />

        <div className="relative max-w-[95vw] mx-auto px-4 py-8">
          {/* Back link */}
          <Link href="/geo-admin">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au Geo Admin
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent">
                      Portail Immobilier
                    </span>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">
                    Gérez vos biens, trouvez des locataires, vendez vos
                    propriétés
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-slate-300">
                    {user.name || user.email}
                  </span>
                  <Badge className="text-xs bg-emerald-900/50 text-emerald-300 border-emerald-500/30">
                    {tierName}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Special Benefit Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-500/20"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-300 text-sm">
                  Avantage Exclusif Abonnés
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  En tant qu'abonné Verso Air, vous bénéficiez d'un accès
                  privilégié à notre plateforme immobilière. Publiez vos offres
                  de vente et location, et trouvez des locataires qualifiés pour
                  vos biens en Côte d'Ivoire.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Tab Navigation ────────────────────────────────────────────────── */}
      <div className="max-w-[95vw] mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10">
          {[
            {
              key: "dashboard" as PortalTab,
              label: "Tableau de Bord",
              icon: BarChart3,
            },
            {
              key: "listings" as PortalTab,
              label: "Mes Offres",
              icon: Building2,
            },
            { key: "add" as PortalTab, label: "Nouvelle Offre", icon: Plus },
            {
              key: "inquiries" as PortalTab,
              label: "Demandes",
              icon: MessageCircle,
            },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.key)}
              className={`gap-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-[95vw] mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* ═══ DASHBOARD TAB ═══════════════════════════════════════════════ */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">
                          Mes Offres
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {totalListings}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <Building2 className="h-5 w-5 text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">
                          Note Moyenne
                        </p>
                        <p className="text-2xl font-bold text-white flex items-center gap-1">
                          <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                          {avgRating}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-yellow-500/20">
                        <Star className="h-5 w-5 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">
                          Valeur Totale
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {(totalRevenue / 1000000).toFixed(1)}M
                        </p>
                        <p className="text-xs text-slate-500">XOF</p>
                      </div>
                      <div className="p-2 rounded-lg bg-teal-500/20">
                        <DollarSign className="h-5 w-5 text-teal-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Vérifiés</p>
                        <p className="text-2xl font-bold text-white">
                          {verifiedCount}
                        </p>
                        <p className="text-xs text-emerald-400">propriétés</p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <Shield className="h-5 w-5 text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="bg-white/5 border-white/10 mb-8">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    Actions Rapides
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      onClick={() => setActiveTab("add")}
                      className="h-auto py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 gap-3"
                    >
                      <Plus className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Publier une offre</div>
                        <div className="text-xs text-emerald-200">
                          Vente ou location
                        </div>
                      </div>
                    </Button>
                    <Button
                      onClick={() => setActiveTab("listings")}
                      variant="outline"
                      className="h-auto py-4 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 gap-3"
                    >
                      <Eye className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Voir mes offres</div>
                        <div className="text-xs text-slate-400">
                          Gérer vos annonces
                        </div>
                      </div>
                    </Button>
                    <Link href="/logement">
                      <Button
                        variant="outline"
                        className="h-auto py-4 w-full bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 gap-3"
                      >
                        <Search className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">Explorer le marché</div>
                          <div className="text-xs text-slate-400">
                            Marketplace publique
                          </div>
                        </div>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Property Types Guide */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Home className="h-5 w-5 text-emerald-400" />
                    Types de Biens Supportés
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Centré sur les réalités immobilières de la Côte d'Ivoire
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {propertyTypes.map((pt) => (
                      <div
                        key={pt.value}
                        className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors"
                      >
                        <div className="font-medium text-sm text-white">
                          {pt.label}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {pt.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ═══ LISTINGS TAB ════════════════════════════════════════════════ */}
          {activeTab === "listings" && (
            <motion.div
              key="listings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  Mes Offres ({myListings.length})
                </h2>
                <Button
                  onClick={() => setActiveTab("add")}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              {isLoadingListings ? (
                <div className="text-center py-16">
                  <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mx-auto mb-3" />
                  <p className="text-slate-400">Chargement de vos offres…</p>
                </div>
              ) : myListings.length === 0 ? (
                <div className="text-center py-16">
                  <Home className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-300 mb-2">
                    Aucune offre pour l'instant
                  </h3>
                  <p className="text-slate-500 mb-6">
                    Commencez par publier votre première annonce immobilière
                  </p>
                  <Button
                    onClick={() => setActiveTab("add")}
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Publier ma première offre
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myListings.map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <Card className="bg-white/5 border-white/10 hover:border-emerald-500/30 transition-all group overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-500/30 text-xs capitalize">
                              {property.type || "property"}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {property.verified && (
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                              )}
                              {property.featured && (
                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                              )}
                            </div>
                          </div>

                          <h3 className="font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1 mb-2">
                            {property.name}
                          </h3>

                          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                            <span>
                              {property.city}
                              {property.location
                                ? `, ${property.location}`
                                : ""}
                            </span>
                          </div>

                          <p className="text-slate-400 text-xs line-clamp-2 mb-3">
                            {property.description}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                            {property.bedrooms > 0 && (
                              <span>{property.bedrooms} ch.</span>
                            )}
                            {property.bathrooms > 0 && (
                              <span>{property.bathrooms} sdb.</span>
                            )}
                            {property.area > 0 && (
                              <span>{property.area} m²</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="text-emerald-300 font-bold">
                              {Number(property.price).toLocaleString()}{" "}
                              <span className="text-xs text-slate-500 font-normal">
                                XOF
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-400 text-sm">
                              <Star className="h-3 w-3 fill-current" />
                              {Number(property.rating).toFixed(1)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ ADD LISTING TAB ═════════════════════════════════════════════ */}
          {activeTab === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {submitSuccess ? (
                <div className="text-center py-16">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                  >
                    <CheckCircle className="h-20 w-20 text-emerald-400 mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-emerald-300 mb-2">
                    Offre publiée !
                  </h3>
                  <p className="text-slate-400">
                    Votre annonce est maintenant visible sur la marketplace
                  </p>
                </div>
              ) : (
                <Card className="bg-white/5 border-white/10 max-w-3xl mx-auto">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-emerald-400" />
                      Publier une Nouvelle Offre
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Remplissez les détails de votre bien immobilier
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Type + Category Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Type de bien *
                        </Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                            >
                              {propertyTypes.find(
                                (t) => t.value === newListing.type,
                              )?.label || "Sélectionner..."}
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-600">
                            {propertyTypes.map((t) => (
                              <DropdownMenuItem
                                key={t.value}
                                onClick={() =>
                                  setNewListing({
                                    ...newListing,
                                    type: t.value,
                                  })
                                }
                                className="text-slate-200 hover:bg-slate-700"
                              >
                                {t.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Catégorie *
                        </Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                            >
                              {categoryOptions.find(
                                (c) => c.value === newListing.category,
                              )?.label || "Vente / Location..."}
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-600">
                            {categoryOptions.map((c) => (
                              <DropdownMenuItem
                                key={c.value}
                                onClick={() =>
                                  setNewListing({
                                    ...newListing,
                                    category: c.value,
                                  })
                                }
                                className="text-slate-200 hover:bg-slate-700"
                              >
                                {c.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <Label className="text-sm text-slate-300 mb-2 block">
                        Titre de l'annonce *
                      </Label>
                      <Input
                        value={newListing.name}
                        onChange={(e) =>
                          setNewListing({ ...newListing, name: e.target.value })
                        }
                        placeholder="Ex: Villa 4 chambres à Cocody Riviera"
                        className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-sm text-slate-300 mb-2 block">
                        Description
                      </Label>
                      <textarea
                        value={newListing.description}
                        onChange={(e) =>
                          setNewListing({
                            ...newListing,
                            description: e.target.value,
                          })
                        }
                        placeholder="Décrivez votre bien, ses atouts, le quartier..."
                        rows={4}
                        className="w-full rounded-md bg-white/5 border border-white/10 text-white placeholder-slate-500 p-3 text-sm resize-none focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {/* City + Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Ville *
                        </Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                            >
                              {newListing.city || "Choisir une ville..."}
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-600 max-h-60 overflow-y-auto">
                            {ivoryCoastCities.map((city) => (
                              <DropdownMenuItem
                                key={city}
                                onClick={() =>
                                  setNewListing({ ...newListing, city })
                                }
                                className="text-slate-200 hover:bg-slate-700"
                              >
                                {city}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Quartier / Zone
                        </Label>
                        <Input
                          value={newListing.location}
                          onChange={(e) =>
                            setNewListing({
                              ...newListing,
                              location: e.target.value,
                            })
                          }
                          placeholder="Ex: Riviera Faya, Zone 4..."
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <Label className="text-sm text-slate-300 mb-2 block">
                        Adresse complète
                      </Label>
                      <Input
                        value={newListing.address}
                        onChange={(e) =>
                          setNewListing({
                            ...newListing,
                            address: e.target.value,
                          })
                        }
                        placeholder="Adresse détaillée du bien"
                        className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                      />
                    </div>

                    {/* Price + Area */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Prix (XOF) *
                        </Label>
                        <Input
                          type="number"
                          value={newListing.price}
                          onChange={(e) =>
                            setNewListing({
                              ...newListing,
                              price: e.target.value,
                            })
                          }
                          placeholder="15000000"
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Surface (m²)
                        </Label>
                        <Input
                          type="number"
                          value={newListing.area}
                          onChange={(e) =>
                            setNewListing({
                              ...newListing,
                              area: e.target.value,
                            })
                          }
                          placeholder="120"
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Chambres
                        </Label>
                        <Input
                          type="number"
                          value={newListing.bedrooms}
                          onChange={(e) =>
                            setNewListing({
                              ...newListing,
                              bedrooms: e.target.value,
                            })
                          }
                          placeholder="3"
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Salles de bain
                        </Label>
                        <Input
                          type="number"
                          value={newListing.bathrooms}
                          onChange={(e) =>
                            setNewListing({
                              ...newListing,
                              bathrooms: e.target.value,
                            })
                          }
                          placeholder="2"
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                        />
                      </div>
                    </div>

                    {/* Amenities + Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Équipements (séparés par virgule)
                        </Label>
                        <Input
                          value={newListing.amenities}
                          onChange={(e) =>
                            setNewListing({
                              ...newListing,
                              amenities: e.target.value,
                            })
                          }
                          placeholder="Piscine, Garage, Gardien, Climatisation..."
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">
                          Téléphone de contact
                        </Label>
                        <Input
                          value={newListing.hostPhone}
                          onChange={(e) =>
                            setNewListing({
                              ...newListing,
                              hostPhone: e.target.value,
                            })
                          }
                          placeholder="+225 07 XX XX XX XX"
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                      <Button
                        variant="outline"
                        onClick={() => setNewListing(emptyListing)}
                        className="border-white/10 text-slate-400 hover:bg-white/5"
                      >
                        Réinitialiser
                      </Button>
                      <Button
                        onClick={handleSubmitListing}
                        disabled={
                          isSubmitting ||
                          !newListing.name ||
                          !newListing.type ||
                          !newListing.city ||
                          !newListing.price
                        }
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 gap-2 px-8"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Publication…
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Publier l'offre
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* ═══ INQUIRIES TAB ═══════════════════════════════════════════════ */}
          {activeTab === "inquiries" && (
            <motion.div
              key="inquiries"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center py-16">
                <MessageCircle className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  Centre de Demandes
                </h3>
                <p className="text-slate-500 mb-2">
                  Les demandes de locataires et acheteurs potentiels
                  apparaîtront ici.
                </p>
                <p className="text-xs text-slate-600">
                  Dès qu'un visiteur s'intéresse à l'une de vos offres, vous
                  recevrez une notification.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ScrollToTop />
    </div>
  );
}

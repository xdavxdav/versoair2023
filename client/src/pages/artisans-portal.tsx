import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Image,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Camera,
  Edit3,
  Plus,
  Trash2,
  Save,
  X,
  ShoppingBag,
  MessageSquare,
  Settings,
  Award,
  Calendar,
  DollarSign,
  Eye,
  Heart,
  Share2,
  ExternalLink,
  Upload,
  Check,
  AlertCircle,
  Palette,
  Briefcase,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ArtisanNav from "@/components/ArtisanNav";

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────
interface ArtisanProfile {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar?: string;
  coverImage?: string;
  specializations: string[];
  yearsExperience?: number;
  hourlyRate?: number;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  portfolioCount: number;
  orderCount: number;
  joinedDate: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  createdAt: string;
  likes: number;
  views: number;
}

interface Review {
  id: string;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  projectTitle?: string;
}

interface Order {
  id: string;
  clientName: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  amount: number;
  createdAt: string;
  deadline?: string;
}

// ─────────────────────────────────────────────────────
// Placeholder Data (replaced by API when available)
// ─────────────────────────────────────────────────────
const EMPTY_PROFILE: ArtisanProfile = {
  id: "",
  displayName: "",
  email: "",
  phone: "",
  bio: "",
  location: "",
  website: "",
  specializations: [],
  yearsExperience: 0,
  hourlyRate: 0,
  isVerified: false,
  rating: 0,
  reviewCount: 0,
  portfolioCount: 0,
  orderCount: 0,
  joinedDate: new Date().toISOString().split("T")[0],
};

const EMPTY_PORTFOLIO: PortfolioItem[] = [];

const EMPTY_REVIEWS: Review[] = [];

const EMPTY_ORDERS: Order[] = [];

const SPECIALIZATIONS = [
  "Bijoux",
  "Perles",
  "Tissage",
  "Poterie",
  "Sculpture",
  "Cuir",
  "Métal",
  "Bois",
  "Textile",
  "Vannerie",
  "Peinture",
  "Broderie",
  "Couture",
  "Céramique",
  "Autre",
];

// ─────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────

// Profile Card
function ProfileCard({
  profile,
  onEdit,
}: {
  profile: ArtisanProfile;
  onEdit: () => void;
}) {
  return (
    <Card className="bg-slate-800/50 border-emerald-500/20 overflow-hidden">
      {/* Cover image */}
      <div className="relative h-32 bg-gradient-to-r from-emerald-600 to-green-600">
        {profile.coverImage && (
          <img
            src={profile.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-slate-900"
          onClick={onEdit}
        >
          <Edit3 className="w-4 h-4" />
        </Button>
      </div>

      {/* Avatar */}
      <div className="relative px-6 -mt-12">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 p-1">
            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-emerald-400" />
              )}
            </div>
          </div>
          {profile.isVerified && (
            <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-slate-900" />
            </div>
          )}
        </div>
      </div>

      <CardContent className="pt-4 pb-6">
        {/* Name & badge */}
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-slate-900">
            {profile.displayName}
          </h2>
          {profile.isVerified && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Vérifié
            </Badge>
          )}
        </div>

        {/* Location */}
        {profile.location && (
          <p className="text-emerald-300/60 text-sm flex items-center gap-1 mb-3">
            <MapPin className="w-3 h-3" />
            {profile.location}
          </p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-slate-300 text-sm mb-4 line-clamp-3">
            {profile.bio}
          </p>
        )}

        {/* Specializations */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.specializations.slice(0, 4).map((spec) => (
            <Badge
              key={spec}
              variant="secondary"
              className="bg-emerald-900/50 text-emerald-300 text-xs"
            >
              {spec}
            </Badge>
          ))}
          {profile.specializations.length > 4 && (
            <Badge
              variant="secondary"
              className="bg-slate-700 text-slate-400 text-xs"
            >
              +{profile.specializations.length - 4}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-emerald-500/10">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{profile.rating}</p>
            <p className="text-xs text-emerald-300/60 flex items-center justify-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              Note
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {profile.portfolioCount}
            </p>
            <p className="text-xs text-emerald-300/60">Créations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {profile.orderCount}
            </p>
            <p className="text-xs text-emerald-300/60">Commandes</p>
          </div>
        </div>

        {/* Contact buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-500"
            size="sm"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Portfolio Grid
function PortfolioGrid({ items }: { items: PortfolioItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <motion.div
          key={item.id}
          whileHover={{ y: -4 }}
          className="group cursor-pointer"
        >
          <Card className="bg-slate-800/50 border-emerald-500/20 overflow-hidden h-full">
            <div className="relative aspect-square">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3 text-slate-900 text-xs">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {item.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {item.views}
                  </span>
                </div>
              </div>
            </div>
            <CardContent className="p-3">
              <h3 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-1">
                {item.title}
              </h3>
              <Badge
                variant="secondary"
                className="bg-emerald-900/50 text-emerald-300 text-xs"
              >
                {item.category}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Add new item card */}
      <motion.div whileHover={{ y: -4 }} className="cursor-pointer">
        <Card className="bg-slate-800/30 border-dashed border-emerald-500/30 hover:border-emerald-500/50 h-full flex items-center justify-center min-h-[200px] transition-colors">
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-emerald-300 font-medium text-sm">
              Ajouter une création
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

// Reviews List
function ReviewsList({ reviews }: { reviews: Review[] }) {
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="bg-slate-800/50 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                {review.authorAvatar ? (
                  <img
                    src={review.authorAvatar}
                    alt={review.authorName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    {review.authorName}
                  </h4>
                  <span className="text-xs text-emerald-300/60">
                    {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-600"}`}
                    />
                  ))}
                </div>
                {review.projectTitle && (
                  <p className="text-xs text-emerald-400 mb-1">
                    Projet: {review.projectTitle}
                  </p>
                )}
                <p className="text-slate-300 text-sm">{review.comment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Orders Table
function OrdersTable({ orders }: { orders: Order[] }) {
  const getStatusBadge = (status: Order["status"]) => {
    const configs = {
      pending: {
        label: "En attente",
        className: "bg-amber-500/20 text-amber-400",
      },
      in_progress: {
        label: "En cours",
        className: "bg-blue-500/20 text-blue-400",
      },
      completed: {
        label: "Terminée",
        className: "bg-green-500/20 text-green-400",
      },
      cancelled: { label: "Annulée", className: "bg-red-500/20 text-red-400" },
    };
    const config = configs[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id} className="bg-slate-800/50 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 text-sm mb-1">
                  {order.title}
                </h4>
                <p className="text-emerald-300/60 text-xs">
                  Client: {order.clientName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-400">
                  {order.amount.toLocaleString()} FCFA
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(order.status)}
                  {order.deadline && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(order.deadline).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {orders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 text-emerald-500/30 mx-auto mb-3" />
          <p className="text-slate-400">Aucune commande pour le moment</p>
        </div>
      )}
    </div>
  );
}

// Settings Form
function SettingsForm({ profile }: { profile: ArtisanProfile }) {
  const [formData, setFormData] = useState({
    displayName: profile.displayName,
    bio: profile.bio || "",
    location: profile.location || "",
    phone: profile.phone || "",
    website: profile.website || "",
    hourlyRate: profile.hourlyRate?.toString() || "",
    specializations: profile.specializations,
  });

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-slate-900 text-lg">
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-emerald-100">Nom d'affichage</Label>
              <Input
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                className="bg-slate-900/50 border-emerald-500/30 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-emerald-100">Téléphone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="bg-slate-900/50 border-emerald-500/30 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-emerald-100">Bio</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="bg-slate-900/50 border-emerald-500/30 text-slate-900 min-h-[100px]"
              placeholder="Parlez de vous et de votre artisanat..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-emerald-100">Localisation</Label>
              <Input
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="bg-slate-900/50 border-emerald-500/30 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-emerald-100">Site web</Label>
              <Input
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                className="bg-slate-900/50 border-emerald-500/30 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-emerald-100">Tarif horaire (FCFA)</Label>
            <Input
              type="number"
              value={formData.hourlyRate}
              onChange={(e) =>
                setFormData({ ...formData, hourlyRate: e.target.value })
              }
              className="bg-slate-900/50 border-emerald-500/30 text-slate-900 max-w-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-emerald-100">Spécialisations</Label>
            <Select>
              <SelectTrigger className="bg-slate-900/50 border-emerald-500/30 text-slate-900">
                <SelectValue placeholder="Ajouter une spécialisation" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALIZATIONS.filter(
                  (s) => !formData.specializations.includes(s),
                ).map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.specializations.map((spec) => (
                <Badge
                  key={spec}
                  className="bg-emerald-500/20 text-emerald-300 cursor-pointer hover:bg-red-500/20 hover:text-red-300"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      specializations: formData.specializations.filter(
                        (s) => s !== spec,
                      ),
                    })
                  }
                >
                  {spec} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────
export default function ArtisansPortal() {
  const [location] = useLocation();
  const [profile] = useState<ArtisanProfile>(EMPTY_PROFILE);
  const [portfolio] = useState<PortfolioItem[]>(EMPTY_PORTFOLIO);
  const [reviews] = useState<Review[]>(EMPTY_REVIEWS);
  const [orders] = useState<Order[]>(EMPTY_ORDERS);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Get active tab from URL
  const searchParams = new URLSearchParams(window.location.search);
  const activeTab = searchParams.get("tab") || "profile";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3efe9] via-emerald-950/20 to-[#efe7dd]">
      {/* Navigation */}
      <ArtisanNav />

      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-green-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-[95vw] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar - Profile Card */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProfileCard
              profile={profile}
              onEdit={() => setIsEditingProfile(true)}
            />

            {/* Quick stats */}
            <Card className="bg-slate-800/50 border-emerald-500/20 mt-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Expérience
                  </span>
                  <span className="text-slate-900 font-medium">
                    {profile.yearsExperience} ans
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Tarif horaire
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {profile.hourlyRate?.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Membre depuis
                  </span>
                  <span className="text-slate-900 font-medium">
                    {new Date(profile.joinedDate).toLocaleDateString("fr-FR", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content area */}
          <div>
            <Tabs value={activeTab} className="space-y-6">
              <TabsList className="bg-slate-800/50 border border-emerald-500/20 p-1">
                <Link href="/artisans-portal">
                  <TabsTrigger
                    value="profile"
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profil
                  </TabsTrigger>
                </Link>
                <Link href="/artisans-portal?tab=portfolio">
                  <TabsTrigger
                    value="portfolio"
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
                  >
                    <Image className="w-4 h-4 mr-2" />
                    Portfolio
                  </TabsTrigger>
                </Link>
                <Link href="/artisans-portal?tab=orders">
                  <TabsTrigger
                    value="orders"
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Commandes
                  </TabsTrigger>
                </Link>
                <Link href="/artisans-portal?tab=reviews">
                  <TabsTrigger
                    value="reviews"
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Avis
                  </TabsTrigger>
                </Link>
                <Link href="/artisans-portal?tab=settings">
                  <TabsTrigger
                    value="settings"
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </TabsTrigger>
                </Link>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Mon Profil
                  </h2>
                  <p className="text-emerald-300/60">
                    Gérez votre présence sur la plateforme
                  </p>
                </div>

                {/* Recent portfolio preview */}
                <Card className="bg-slate-800/50 border-emerald-500/20">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900">
                        Dernières créations
                      </CardTitle>
                      <CardDescription className="text-emerald-300/60">
                        Vos œuvres les plus récentes
                      </CardDescription>
                    </div>
                    <Link href="/artisans-portal?tab=portfolio">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        Voir tout <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {portfolio.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="aspect-square rounded-lg overflow-hidden"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent reviews preview */}
                <Card className="bg-slate-800/50 border-emerald-500/20">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-900">
                        Derniers avis
                      </CardTitle>
                      <CardDescription className="text-emerald-300/60">
                        Ce que disent vos clients
                      </CardDescription>
                    </div>
                    <Link href="/artisans-portal?tab=reviews">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        Voir tout <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <ReviewsList reviews={reviews.slice(0, 2)} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Portfolio Tab */}
              <TabsContent value="portfolio" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                      Mon Portfolio
                    </h2>
                    <p className="text-emerald-300/60">
                      {portfolio.length} créations
                    </p>
                  </div>
                  <Button className="bg-emerald-600 hover:bg-emerald-500">
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
                <PortfolioGrid items={portfolio} />
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Mes Commandes
                  </h2>
                  <p className="text-emerald-300/60">
                    {orders.length} commande(s)
                  </p>
                </div>
                <OrdersTable orders={orders} />
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Avis Clients
                  </h2>
                  <p className="text-emerald-300/60">
                    {reviews.length} avis · Note moyenne: {profile.rating}/5
                  </p>
                </div>
                <ReviewsList reviews={reviews} />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Paramètres
                  </h2>
                  <p className="text-emerald-300/60">
                    Gérez vos informations et préférences
                  </p>
                </div>
                <SettingsForm profile={profile} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

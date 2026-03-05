import { useMemo, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  ChevronRight,
  Award,
  Calendar,
  Shield,
  ShieldCheck,
  Tag,
  Briefcase,
  Package,
  Copy,
  CheckCircle,
  XCircle,
  Building,
  Sparkles,
  Navigation,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useScrollLock } from "@/hooks/use-scroll-lock";

/* ─── Types ──────────────────────────────────────────────────────── */

interface Review {
  id: number | string;
  rating: number;
  title?: string;
  content?: string;
}

interface Service {
  id: number | string;
  name: string;
  category?: string;
  price?: number | string | null;
}

interface Business {
  id: number | string;
  name: string;
  category_name?: string;
  categoryName?: string;
  status?: string;
  verified?: boolean;
  is_verified?: boolean;
  is_advertiser?: boolean;
  description?: string;
  address?: string;
  location?: string;
  phone?: string;
  email?: string;
  created_at?: string;
  createdAt?: string;
  attributes?: Record<string, any>;
  tags?: string[];
  services?: Service[];
  reviews?: Review[];
  rating?: number | string;
  performance_score?: string;
  latitude?: string;
  longitude?: string;
  [key: string]: any;
}

/* ─── Industry UI helpers ────────────────────────────────────────── */

const industryMap: Record<
  string,
  { icon: string; gradient: string; label: string }
> = {
  commerce: {
    icon: "🛍️",
    gradient: "from-amber-500/70 via-orange-500/70 to-yellow-500/70",
    label: "Commerce",
  },
  hotellerie: {
    icon: "🏨",
    gradient: "from-indigo-500/70 via-blue-500/70 to-cyan-500/70",
    label: "Hospitality",
  },
  batiment: {
    icon: "🏗️",
    gradient: "from-emerald-500/70 via-green-500/70 to-teal-500/70",
    label: "Construction",
  },
  automobile: {
    icon: "🚗",
    gradient: "from-slate-500/70 via-slate-400/70 to-slate-300/70",
    label: "Automobile",
  },
  finance: {
    icon: "💰",
    gradient: "from-lime-500/70 via-emerald-500/70 to-green-500/70",
    label: "Finance",
  },
  divertissement: {
    icon: "🎭",
    gradient: "from-pink-500/70 via-fuchsia-500/70 to-purple-500/70",
    label: "Entertainment",
  },
};
const defaultUI = {
  icon: "🏢",
  gradient: "from-slate-500/70 via-slate-400/70 to-slate-300/70",
  label: "Business",
};

function getIndustryUI(category: string) {
  const key = (category || "").toLowerCase();
  for (const [k, v] of Object.entries(industryMap)) {
    if (key.includes(k)) return v;
  }
  return defaultUI;
}

function avgRating(reviews: Review[] = []) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ─── Component ──────────────────────────────────────────────────── */

export default function BusinessDetailPage() {
  const [, params] = useRoute("/business/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showProfitModal, setShowProfitModal] = useState(false);
  useScrollLock(showProfitModal);

  const businessId = params?.id;

  /* ── Queries ─────────────────────────────────────────────────── */

  const {
    data: businessData,
    isLoading,
    isError,
  } = useQuery<any>({
    queryKey: ["business", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const res = await fetch(`/api/businesses/${businessId}`);
      if (!res.ok) throw new Error("Failed to load business");
      return res.json();
    },
  });

  const { data: suggestionsRaw = [], isLoading: isSuggestionsLoading } =
    useQuery<any[]>({
      queryKey: ["business-suggestions", businessId, businessData],
      enabled: Boolean(businessId) && Boolean(businessData),
      queryFn: async () => {
        try {
          const biz =
            businessData?.business ?? businessData?.data ?? businessData;
          const catId = biz?.category_id;
          if (!catId) return [];
          const res = await fetch(
            `/api/businesses?categoryId=${catId}&limit=9`,
          );
          if (!res.ok) return [];
          const json = await res.json();
          const list: any[] = Array.isArray(json)
            ? json
            : (json?.data ?? json?.businesses ?? []);
          // exclude the current business
          return list.filter((b: any) => String(b.id) !== String(businessId));
        } catch {
          return [];
        }
      },
    });

  const suggestions: any[] = Array.isArray(suggestionsRaw)
    ? suggestionsRaw
    : [];

  /* ── Derived state ───────────────────────────────────────────── */

  const business: Business | undefined = useMemo(() => {
    if (!businessData) return undefined;
    return businessData?.business ?? businessData?.data ?? businessData;
  }, [businessData]);

  const attrs: Record<string, any> = business?.attributes || {};
  const tags = useMemo(() => {
    const set = new Set<string>();
    (business?.tags || []).forEach((t: string) => set.add(t));
    (attrs?.tags || []).forEach((t: string) => set.add(t));
    if (attrs?.specialization) set.add(attrs.specialization);
    return Array.from(set);
  }, [business?.tags, attrs]);

  const rating = useMemo(() => {
    const r = business?.rating;
    if (typeof r === "number") return r;
    if (typeof r === "string") return parseFloat(r) || 0;
    return avgRating(business?.reviews || []);
  }, [business?.rating, business?.reviews]);

  const catName =
    business?.category_name || business?.categoryName || attrs?.category || "";
  const ui = getIndustryUI(catName);
  const isVerified = Boolean(business?.verified || business?.is_verified);
  const isActive = (business?.status || "active").toLowerCase() !== "inactive";
  const serviceCount =
    business?.services?.length || (attrs?.services as string[])?.length || 0;
  const reviewCount = business?.reviews?.length || 0;

  const heroBlurb = useMemo(() => {
    const sector = catName || "local";
    return `A ${sector} partner built for traction — clear offers, responsive support, and measurable results.`;
  }, [catName]);

  const mapsLink = useMemo(() => {
    if (business?.latitude && business?.longitude)
      return `https://www.openstreetmap.org/?mlat=${business.latitude}&mlon=${business.longitude}#map=16/${business.latitude}/${business.longitude}`;
    return "";
  }, [business?.latitude, business?.longitude]);

  /* ── Helpers ─────────────────────────────────────────────────── */

  const copyToClipboard = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      toast({ description: "Copied to clipboard" });
    });
  };

  /* ── Loading state ───────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-6">
          <Skeleton className="h-10 w-2/3 bg-white/5" />
          <Skeleton className="h-6 w-1/2 bg-white/5" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ─────────────────────────────────────────────── */

  if (isError || !business) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 items-center justify-center px-4">
        <Card className="bg-white/5 border-white/10 max-w-md">
          <CardHeader>
            <CardTitle className="text-slate-100">Business not found</CardTitle>
            <CardDescription className="text-slate-500">
              We couldn't load this business. It may have been removed or is
              temporarily unavailable.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="ghost"
              className="gap-2 text-slate-200"
              onClick={() => setLocation("/businesses-directory")}
            >
              <ArrowRight className="h-4 w-4" />
              Back to directory
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  /* ── Main render ─────────────────────────────────────────────── */

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* ══════════════ HERO SECTION ══════════════ */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Icon */}
            <div
              className={`flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${ui.gradient} flex items-center justify-center text-4xl shadow-xl border border-white/20`}
            >
              {ui.icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Name + badges */}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight">
                  {business.name}
                </h1>
                {isVerified && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <ShieldCheck className="h-6 w-6 text-emerald-400" />
                      </TooltipTrigger>
                      <TooltipContent>Verified Business</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {business.is_advertiser && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                    <Sparkles className="h-3 w-3 mr-1" /> Promoted
                  </Badge>
                )}
              </div>

              {/* Star rating */}
              {rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-slate-300">
                    {rating.toFixed(1)}
                  </span>
                  {reviewCount > 0 && (
                    <span className="text-sm text-slate-500">
                      ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              )}

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                {catName && (
                  <Badge className="bg-white/10 border-white/20 text-slate-200">
                    {ui.icon} {catName}
                  </Badge>
                )}
                <Badge
                  className={
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }
                >
                  {isActive ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {isActive ? "Active" : "Inactive"}
                </Badge>
                {attrs.type && (
                  <Badge className="bg-white/10 border-white/20 text-slate-300">
                    {attrs.type}
                  </Badge>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs bg-white/5 border-white/10 text-slate-400"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Hero blurb + CTA row */}
              <div className="space-y-3">
                <p className="text-slate-400 leading-relaxed max-w-2xl">
                  {heroBlurb}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {business.phone && (
                    <Button
                      asChild
                      size="sm"
                      className="gap-2 bg-gradient-to-r from-emerald-500/90 to-green-600/90 text-white hover:from-emerald-500 hover:to-green-600"
                    >
                      <a href={`tel:${business.phone}`}>
                        <Phone className="h-4 w-4" /> Call Now
                      </a>
                    </Button>
                  )}
                  {business.email && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                    >
                      <a href={`mailto:${business.email}`}>
                        <Mail className="h-4 w-4" /> Email
                      </a>
                    </Button>
                  )}
                  {mapsLink && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-slate-300 hover:text-amber-300 hover:bg-white/5"
                    >
                      <a href={mapsLink} target="_blank" rel="noreferrer">
                        <Navigation className="h-4 w-4" /> Directions
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-amber-300 hover:text-amber-200 hover:bg-white/5"
                    onClick={() => setShowProfitModal(true)}
                  >
                    <Sparkles className="h-4 w-4" /> Profit Window
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick highlight tiles */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-slate-500">Rating</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {rating > 0 ? rating.toFixed(1) : "—"}
                  </p>
                </div>
                <Star className="h-5 w-5 text-amber-400" />
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-slate-500">Services</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {serviceCount}
                  </p>
                </div>
                <Briefcase className="h-5 w-5 text-slate-300" />
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-slate-500">Reviews</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {reviewCount}
                  </p>
                </div>
                <MessageSquare className="h-5 w-5 text-slate-300" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════════ MAIN GRID ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column (2/3) ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {business.description && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Building className="h-5 w-5 text-slate-400" /> About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {business.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact & Location cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {business.address && (
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl hover:bg-white/[0.07] transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <MapPin className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Address
                        </p>
                        <p className="text-sm text-slate-200 mt-1">
                          {business.address}
                        </p>
                        {business.location && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {business.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {business.phone && (
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl hover:bg-white/[0.07] transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Phone className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Phone
                        </p>
                        <a
                          href={`tel:${business.phone}`}
                          className="text-sm text-slate-200 hover:text-emerald-300 transition-colors mt-1 block"
                        >
                          {business.phone}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {business.email && (
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl hover:bg-white/[0.07] transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <Mail className="h-5 w-5 text-rose-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Email
                        </p>
                        <a
                          href={`mailto:${business.email}`}
                          className="text-sm text-slate-200 hover:text-rose-300 transition-colors mt-1 block truncate"
                        >
                          {business.email}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(business.created_at || business.createdAt) && (
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl hover:bg-white/[0.07] transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <Calendar className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Member Since
                        </p>
                        <p className="text-sm text-slate-200 mt-1">
                          {formatDate(
                            business.created_at || business.createdAt,
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Business Details / Attributes */}
            {attrs && Object.keys(attrs).length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Package className="h-5 w-5 text-slate-400" /> Business
                    Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {attrs.type && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-slate-500 uppercase">Type</p>
                        <p className="text-sm font-medium text-slate-200 mt-1">
                          {attrs.type}
                        </p>
                      </div>
                    )}
                    {attrs.license && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-slate-500 uppercase">
                          License
                        </p>
                        <p className="text-sm font-medium text-slate-200 mt-1">
                          {attrs.license}
                        </p>
                      </div>
                    )}
                    {attrs.capacity !== undefined && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-slate-500 uppercase">
                          Capacity
                        </p>
                        <p className="text-sm font-medium text-slate-200 mt-1">
                          {attrs.capacity}
                        </p>
                      </div>
                    )}
                    {attrs.price !== undefined && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-slate-500 uppercase">
                          Price
                        </p>
                        <p className="text-sm font-medium text-slate-200 mt-1">
                          ${attrs.price}
                        </p>
                      </div>
                    )}
                    {attrs.delivery !== undefined && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-slate-500 uppercase">
                          Delivery
                        </p>
                        <p className="text-sm font-medium text-slate-200 mt-1">
                          {attrs.delivery ? "✅ Available" : "❌ Not available"}
                        </p>
                      </div>
                    )}
                  </div>

                  {attrs.products && attrs.products.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 uppercase mb-2">
                        Products
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.products.map((p: string) => (
                          <Badge
                            key={p}
                            className="bg-white/10 border-white/20 text-slate-300 text-xs"
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {attrs.brands && attrs.brands.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 uppercase mb-2">
                        Brands
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.brands.map((b: string) => (
                          <Badge
                            key={b}
                            className="bg-white/10 border-white/20 text-slate-300 text-xs"
                          >
                            {b}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {attrs.services && attrs.services.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 uppercase mb-2">
                        Services
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.services.map((s: string) => (
                          <Badge
                            key={s}
                            className="bg-white/10 border-white/20 text-slate-300 text-xs"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Services (from JOIN) */}
            {business.services && business.services.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-slate-400" /> Services (
                    {business.services.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {business.services.map((svc) => (
                      <div
                        key={svc.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/[0.07] transition-all"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {svc.name}
                          </p>
                          {svc.category && (
                            <p className="text-xs text-slate-500">
                              {svc.category}
                            </p>
                          )}
                        </div>
                        {svc.price !== undefined && svc.price !== null && (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            ${svc.price}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {business.reviews && business.reviews.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-slate-400" /> Reviews
                    ({business.reviews.length})
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    Average rating: {avgRating(business.reviews).toFixed(1)} / 5
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {business.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 bg-white/5 rounded-xl border border-white/10"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < Math.round(review.rating) ? "fill-amber-400 text-amber-400" : "text-slate-600"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400">
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                      {review.title && (
                        <p className="text-sm font-medium text-slate-200 mb-1">
                          {review.title}
                        </p>
                      )}
                      {review.content && (
                        <p className="text-sm text-slate-400 leading-relaxed">
                          {review.content}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Map Embed */}
            {business.latitude && business.longitude && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-slate-400" /> Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <iframe
                    title="Business Location"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(business.longitude) - 0.01},${parseFloat(business.latitude) - 0.01},${parseFloat(business.longitude) + 0.01},${parseFloat(business.latitude) + 0.01}&layer=mapnik&marker=${business.latitude},${business.longitude}`}
                    className="rounded-b-xl"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right Sidebar (1/3) ────────────────────────────── */}
          <div className="space-y-6">
            {/* Contact Actions */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-slate-100 text-base">
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {business.phone && (
                  <Button
                    asChild
                    className="w-full gap-2 bg-gradient-to-r from-emerald-500/90 to-green-600/90 text-white hover:from-emerald-500 hover:to-green-600 shadow-lg"
                    size="lg"
                  >
                    <a href={`tel:${business.phone}`}>
                      <Phone className="h-4 w-4" /> Call Now
                    </a>
                  </Button>
                )}
                {business.email && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full gap-2 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    size="lg"
                  >
                    <a href={`mailto:${business.email}`}>
                      <Mail className="h-4 w-4" /> Send Email
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  size="lg"
                >
                  <MessageSquare className="h-4 w-4" /> Message
                </Button>
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      [business.phone, business.email, business.address]
                        .filter(Boolean)
                        .join(" • "),
                    )
                  }
                >
                  <Copy className="h-3 w-3" /> Copy contact info
                </Button>
              </CardContent>
            </Card>

            {/* Business Info */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-slate-100 text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" /> Business Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <Badge
                    className={
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    }
                  >
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {isVerified && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Verified</span>
                    <div className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-xs font-medium">Yes</span>
                    </div>
                  </div>
                )}
                {catName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Category</span>
                    <span className="text-slate-200 font-medium">
                      {catName}
                    </span>
                  </div>
                )}
                {(business.created_at || business.createdAt) && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Member Since</span>
                    <span className="text-slate-200">
                      {new Date(
                        business.created_at || business.createdAt || "",
                      ).getFullYear()}
                    </span>
                  </div>
                )}
                {business.performance_score &&
                  parseFloat(business.performance_score) > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500">
                          Performance Score
                        </span>
                        <span className="text-slate-200 font-medium">
                          {parseFloat(business.performance_score).toFixed(1)}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          parseFloat(business.performance_score) * 10,
                          100,
                        )}
                        className="h-2 bg-white/5"
                      />
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardContent className="p-4 space-y-2">
                <Link href="/businesses-directory">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    size="sm"
                  >
                    <Building className="h-4 w-4" /> Business Directory
                  </Button>
                </Link>
                <Link href="/geo-admin">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    size="sm"
                  >
                    <Globe className="h-4 w-4" /> Geo Admin Observer
                  </Button>
                </Link>
                <Link href="/geo-admin/dashboard">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-amber-400/80 hover:text-amber-300 hover:bg-white/5"
                    size="sm"
                  >
                    <Shield className="h-4 w-4" /> Admin Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════════ SUGGESTIONS ══════════════ */}
        {suggestions.length > 0 && (
          <div className="space-y-6 pt-4">
            <Separator className="bg-white/10" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-amber-400" /> You Might Also
                  Like
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {catName
                    ? `Similar businesses in ${catName}`
                    : "Discover more businesses"}
                </p>
              </div>
              <Link href="/businesses-directory">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 gap-2"
                >
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {suggestions.slice(0, 8).map((biz: any) => {
                const bizCat: string =
                  biz.category_name || biz.categoryName || "";
                const bizUI = getIndustryUI(bizCat);
                return (
                  <Link key={biz.id} href={`/business/${biz.id}`}>
                    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl hover:shadow-2xl hover:bg-white/[0.07] transition-all duration-500 cursor-pointer group h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${bizUI.gradient} flex items-center justify-center text-lg shadow-md border border-white/20`}
                          >
                            {bizUI.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-100 truncate text-sm group-hover:text-white transition-colors">
                              {biz.name}
                            </h3>
                            {biz.address && (
                              <p className="text-xs text-slate-500 mt-1 truncate">
                                📍 {biz.address}
                              </p>
                            )}
                            {bizCat && (
                              <Badge className="mt-2 text-xs bg-white/10 border-white/20 text-slate-400">
                                {bizCat}
                              </Badge>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {biz.rating && (
                                <span className="text-xs text-slate-500">
                                  ⭐{" "}
                                  {typeof biz.rating === "string"
                                    ? parseFloat(biz.rating).toFixed(1)
                                    : biz.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-1 transition-all mt-1 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {isSuggestionsLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-28 w-full rounded-xl bg-white/5 border border-white/10"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════ PROFIT POPUP MODAL ══════════════ */}
      {showProfitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setShowProfitModal(false)}
          />

          <Card className="relative max-w-2xl w-full bg-slate-900/95 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-amber-300" />
                  Profit Window — {business.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:text-slate-200 -mr-2"
                  onClick={() => setShowProfitModal(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription className="text-slate-500">
                Monetisation toolkit — promotions, sponsorship, booking &
                analytics at a glance.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 text-sm text-slate-300">
              {/* Overview */}
              <p className="leading-relaxed">
                This profit window is the revenue hub for{" "}
                <span className="text-white font-semibold">
                  {business.name}
                </span>
                . Use it to configure offers, track conversion funnels, and
                manage sponsorship placements that turn page views into
                measurable revenue.
              </p>

              {/* Two-column feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Promotions */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-amber-400" />
                    <h4 className="font-semibold text-amber-200">Promotions</h4>
                  </div>
                  <ul className="space-y-1.5 text-slate-400 text-xs">
                    <li>• Flash sale banners & countdown timers</li>
                    <li>• First-visit discount codes</li>
                    <li>• Seasonal bundle offers</li>
                    <li>• Referral reward programmes</li>
                  </ul>
                </div>

                {/* Booking & Leads */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    <h4 className="font-semibold text-emerald-200">
                      Booking & Leads
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-slate-400 text-xs">
                    <li>• Inline booking calendar widget</li>
                    <li>• Quick-quote request form</li>
                    <li>• Live chat / WhatsApp redirect</li>
                    <li>• Lead capture with email drip</li>
                  </ul>
                </div>

                {/* Sponsorship */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-purple-400" />
                    <h4 className="font-semibold text-purple-200">
                      Sponsorship
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-slate-400 text-xs">
                    <li>• Featured placement in directory</li>
                    <li>• Banner ad slots on sector pages</li>
                    <li>• "Promoted" badge & priority sort</li>
                    <li>• Cross-sell in suggestion cards</li>
                  </ul>
                </div>

                {/* Analytics */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-blue-400" />
                    <h4 className="font-semibold text-blue-200">Analytics</h4>
                  </div>
                  <ul className="space-y-1.5 text-slate-400 text-xs">
                    <li>• Page-view & click-through rates</li>
                    <li>• Conversion funnel tracking</li>
                    <li>• Revenue attribution reports</li>
                    <li>• A/B test results for offers</li>
                  </ul>
                </div>
              </div>

              {/* Business quick stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-lg font-bold text-slate-100">
                    {rating > 0 ? rating.toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-slate-500">Rating</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-lg font-bold text-slate-100">
                    {serviceCount}
                  </p>
                  <p className="text-xs text-slate-500">Services</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-lg font-bold text-slate-100">
                    {reviewCount}
                  </p>
                  <p className="text-xs text-slate-500">Reviews</p>
                </div>
              </div>

              {/* Info banner */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
                💡 <span className="font-semibold">Coming soon:</span> Real
                promotional content, live pricing tiers, booking integrations,
                and conversion dashboards will replace these placeholders. Each
                card above will become an interactive module you can configure
                per business.
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between pt-4 border-t border-white/10">
              <p className="text-xs text-slate-600">
                Profit Window v0.1 — preview
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-200"
                  onClick={() => setShowProfitModal(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white hover:from-amber-500 hover:to-orange-500 gap-2"
                  onClick={() => setShowProfitModal(false)}
                >
                  <Sparkles className="h-4 w-4" /> Got it
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

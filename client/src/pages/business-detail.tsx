import { useMemo, useRef, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Zap,
  Eye,
  Camera,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { FicheTechnique } from "@/components/FicheTechnique";
import { FicheEditor } from "@/components/FicheEditor";
import { useOptionalAuthContext } from "@/contexts/AuthContext";
import {
  ficheSectorStyle,
  getFicheSectorPalette,
} from "@/lib/fiche-sector-theme";
import { SeoHead } from "@/components/seo/SeoHead";

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
  sector_slug?: string | null;
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
  website?: string | null;
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
  logo_url?: string; // optional for future avatar
  cover_url?: string | null;
  [key: string]: any;
}

type MediaKind = "logo" | "cover";

const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/svg+xml,image/gif";

/* ─── Industry UI helpers with emoji avatars ────────────────────────── */

const industryMap: Record<
  string,
  { icon: string; label: string; avatarEmoji: string }
> = {
  commerce: {
    icon: "🛍️",
    label: "Commerce",
    avatarEmoji: "🛒",
  },
  hotellerie: {
    icon: "🏨",
    label: "Hospitality",
    avatarEmoji: "🏨",
  },
  batiment: {
    icon: "🏗️",
    label: "Construction",
    avatarEmoji: "🔨",
  },
  automobile: {
    icon: "🚗",
    label: "Automobile",
    avatarEmoji: "🚗",
  },
  finance: {
    icon: "💰",
    label: "Finance",
    avatarEmoji: "💵",
  },
  divertissement: {
    icon: "🎭",
    label: "Entertainment",
    avatarEmoji: "🎬",
  },
};
const defaultUI = {
  icon: "🏢",
  label: "Business",
  avatarEmoji: "🏢",
};

function getIndustryUI(category: string) {
  const key = (category || "").toLowerCase();
  for (const [k, v] of Object.entries(industryMap)) {
    if (key.includes(k)) return v;
  }
  return defaultUI;
}

// Enhanced avatar emoji resolver based on category and business name
function getBusinessAvatarEmoji(business: Business | undefined): string {
  if (!business) return "🏢";
  const category = business.category_name || business.categoryName || "";
  const ui = getIndustryUI(category);
  // if business name contains specific keywords, override
  const name = business.name.toLowerCase();
  if (name.includes("pizza") || name.includes("burger")) return "🍕";
  if (name.includes("coffee") || name.includes("café")) return "☕";
  if (name.includes("tech") || name.includes("digital")) return "💻";
  if (name.includes("health") || name.includes("fitness")) return "💪";
  if (name.includes("beauty") || name.includes("spa")) return "💄";
  if (name.includes("hotel") || name.includes("inn")) return "🏨";
  if (name.includes("auto") || name.includes("car")) return "🚗";
  return ui.avatarEmoji;
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

// Safe array helper to prevent JSON string errors
function safeArray<T = string>(v: unknown): T[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
    } catch {}
  }
  return [];
}

/* ─── Futuristic Graffiti Background Component ──────────────────────── */
function GraffitiBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-fiche-soft via-white to-fiche-border" />

      {/* Grunge / spray texture */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 40%, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Graffiti spray elements */}
      <div className="absolute top-[15%] left-[5%] text-8xl opacity-10 rotate-12 select-none font-mono text-slate-900">
        ✪
      </div>
      <div className="absolute bottom-[20%] right-[3%] text-7xl opacity-10 -rotate-6 select-none text-fiche-accent">
        ⨀
      </div>
      <div className="absolute top-[40%] right-[12%] text-6xl opacity-8 rotate-45 select-none text-fiche-accent">
        ⌘
      </div>
      <div className="absolute bottom-[30%] left-[8%] text-5xl opacity-8 -rotate-12 select-none text-fiche-accent">
        ◈
      </div>
      <div className="absolute top-[70%] left-[20%] w-64 h-64 rounded-full bg-fiche-soft blur-3xl animate-pulse" />
      <div className="absolute top-[10%] right-[10%] w-96 h-96 rounded-full bg-fiche-border blur-3xl animate-pulse delay-1000" />

      {/* Neon grid lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-fiche-accent"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Graffiti tag mock */}
      <div className="absolute bottom-8 right-8 font-mono text-xs text-slate-900/5 tracking-widest select-none">
        VERSO // AIR // DISCOVER
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────────── */

export default function BusinessDetailPage() {
  const [, params] = useRoute("/business/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showProfitModal, setShowProfitModal] = useState(false);
  useScrollLock(showProfitModal);

  const businessId = params?.id;
  const queryClient = useQueryClient();
  const auth = useOptionalAuthContext();
  const [ficheEditorOpen, setFicheEditorOpen] = useState(false);

  // Only owners and staff get a successful answer; everyone else sees no edit button.
  const { data: ficheAccess } = useQuery<{ canEdit: boolean; ownsBusiness?: boolean }>({
    queryKey: ["business-fiche-access", businessId, auth?.user?.id ?? null],
    enabled: Boolean(businessId && auth?.user),
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/businesses/${businessId}/fiche/access`, {
        credentials: "include",
      });
      if (!res.ok) return { canEdit: false, ownsBusiness: false };
      return res.json();
    },
  });
  const canEditFiche = ficheAccess?.canEdit === true;
  // Logo and cover changes are owner-only, matching the server routes.
  const isOwner = ficheAccess?.ownsBusiness === true;
  const [mediaBusy, setMediaBusy] = useState<MediaKind | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  /* ── Queries ─────────────────────────────────────────────────── */

  const {
    data: businessData,
    isLoading,
    isError,
    error,
  } = useQuery<any>({
    queryKey: ["business", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      console.log("[BusinessDetail] Fetching business:", businessId);
      const res = await fetch(`/api/businesses/${businessId}`);
      if (!res.ok) {
        console.error(
          "[BusinessDetail] Fetch failed:",
          res.status,
          res.statusText,
        );
        throw new Error("Failed to load business");
      }
      const data = await res.json();
      console.log("[BusinessDetail] Response:", data);
      return data;
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
    const extracted =
      businessData?.business ?? businessData?.data ?? businessData;
    console.log(
      "[BusinessDetail] Extracted business:",
      extracted?.name || "MISSING",
    );
    return extracted;
  }, [businessData]);

  const attrs: Record<string, any> = business?.attributes || {};

  const tags = useMemo(() => {
    const set = new Set<string>();
    safeArray(business?.tags).forEach((t) => set.add(t));
    safeArray(attrs?.tags).forEach((t) => set.add(t));
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
    business?.services?.length || safeArray(attrs?.services).length || 0;
  const reviewCount = business?.reviews?.length || 0;

  // Avatar emoji for the business
  const avatarEmoji = getBusinessAvatarEmoji(business);

  const ledeText = useMemo(() => {
    const text = (business?.description || "").replace(/\s+/g, " ").trim();
    if (text.length <= 240) return text;
    return `${text.slice(0, 237).trimEnd()}…`;
  }, [business?.description]);

  const memberSince = useMemo(() => {
    const raw = business?.created_at || business?.createdAt;
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return { year: String(date.getFullYear()), full: formatDate(raw) };
  }, [business?.created_at, business?.createdAt]);

  const websiteHref = useMemo(() => {
    const raw = (business?.website || "").trim();
    return /^https?:\/\//i.test(raw) ? raw : "";
  }, [business?.website]);

  const mapsLink = useMemo(() => {
    if (business?.latitude && business?.longitude)
      return `https://www.openstreetmap.org/?mlat=${business.latitude}&mlon=${business.longitude}#map=16/${business.latitude}/${business.longitude}`;
    return "";
  }, [business?.latitude, business?.longitude]);

  const canonicalPath = businessId ? `/business/${businessId}` : "/businesses-directory";
  const metaTitle = business?.name
    ? `${business.name} | VersoAir`
    : "Business Profile | VersoAir";
  const metaDescription = (() => {
    const baseDescription =
      business?.description?.trim() ||
      "Discover business details, contact information, and service highlights on VersoAir.";
    const locationHint = [business?.location, business?.address]
      .filter(Boolean)
      .join(" • ");
    const combined = locationHint
      ? `${baseDescription} ${locationHint}`
      : baseDescription;
    return combined.slice(0, 160);
  })();
  const businessJsonLd = business
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: business.name,
        description: business.description || undefined,
        url: `https://www.versoair.com${canonicalPath}`,
        telephone: business.phone || undefined,
        email: business.email || undefined,
        address: business.address
          ? {
              "@type": "PostalAddress",
              streetAddress: business.address,
              addressLocality: business.location || undefined,
            }
          : undefined,
        aggregateRating:
          rating > 0
            ? {
                "@type": "AggregateRating",
                ratingValue: Number(rating.toFixed(1)),
                reviewCount:
                  (business.reviews && business.reviews.length) || reviewCount || 1,
              }
            : undefined,
      }
    : undefined;

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
      <div className="relative flex flex-col min-h-screen bg-fiche-soft text-slate-900">
        <SeoHead
          title="Loading Business Profile | VersoAir"
          description="Loading business information from the VersoAir directory."
          canonicalPath={canonicalPath}
        />
        <GraffitiBackground />
        <div className="relative z-10 max-w-[95vw] mx-auto px-4 sm:px-6 py-16 space-y-6">
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

  if (!isLoading && (isError || !business)) {
    console.error("[BusinessDetail] Error state:", {
      isError,
      hasBusiness: !!business,
      error,
    });
    return (
      <div className="relative flex flex-col min-h-screen bg-fiche-soft text-slate-900 items-center justify-center px-4">
        <SeoHead
          title="Business Not Found | VersoAir"
          description="The requested business profile is unavailable or no longer listed on VersoAir."
          canonicalPath={canonicalPath}
        />
        <GraffitiBackground />
        <Card className="text-slate-900 relative z-10 bg-white/5 backdrop-blur-xl border-slate-200 max-w-md shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-700">Business not found</CardTitle>
            <CardDescription className="text-slate-700">
              We couldn't load this business. It may have been removed or is
              temporarily unavailable.
              {error && (
                <div className="mt-2 text-xs text-red-700">
                  Error: {String(error)}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="ghost"
              className="gap-2 text-slate-700 hover:text-amber-800"
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

  // TypeScript narrowing: after the error guard above, business is guaranteed defined
  const biz = business!;
  const ficheStyle = ficheSectorStyle(getFicheSectorPalette(biz.sector_slug));

  // The server decides the paid-tier gate and explains a refusal in `message`, so we show that text as-is.
  const runMediaChange = async (kind: MediaKind, send: () => Promise<Response>) => {
    setMediaBusy(kind);
    try {
      const res = await send();
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Request failed.");
      queryClient.invalidateQueries({ queryKey: ["business", businessId] });
    } catch (err) {
      toast({
        title: kind === "logo" ? "Logo not updated" : "Cover photo not updated",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setMediaBusy(null);
    }
  };

  const uploadMedia = (kind: MediaKind, file: File) => {
    const formData = new FormData();
    formData.append(kind, file);
    formData.append("businessId", String(biz.id));
    return runMediaChange(kind, () =>
      fetch(
        kind === "logo" ? "/api/business-logo/upload" : "/api/business-cover/upload",
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      ),
    );
  };

  const removeMedia = (kind: MediaKind) =>
    runMediaChange(kind, () =>
      fetch(
        kind === "logo" ? `/api/business-logo/${biz.id}` : `/api/business-cover/${biz.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      ),
    );

  const handleMediaFileChange =
    (kind: MediaKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) void uploadMedia(kind, file);
    };

  return (
    <div className="relative flex flex-col min-h-screen bg-[#F6F1E9] font-inter text-[#1E2A32]" style={ficheStyle} data-testid="business-fiche">
      <SeoHead
        title={metaTitle}
        description={metaDescription}
        canonicalPath={canonicalPath}
        jsonLd={businessJsonLd}
      />
      {(biz.phone || biz.email || mapsLink) && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-fiche-border bg-white/95 p-3 backdrop-blur md:hidden">
          {biz.phone && (
            <Button asChild className="flex-1 gap-2 bg-fiche-accent text-white hover:bg-fiche-accent hover:brightness-90">
              <a href={`tel:${biz.phone}`}>
                <Phone className="h-4 w-4" /> Call
              </a>
            </Button>
          )}
          {biz.email && (
            <Button asChild variant="outline" className="flex-1 gap-2 border-fiche-border bg-white text-[#1E2A32]">
              <a href={`mailto:${biz.email}`}>
                <Mail className="h-4 w-4" /> Email
              </a>
            </Button>
          )}
          {mapsLink && (
            <Button asChild variant="outline" className="flex-1 gap-2 border-fiche-border bg-white text-[#1E2A32]">
              <a href={mapsLink} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" /> Directions
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-[1140px] px-[clamp(16px,4vw,40px)] pb-28 pt-5 md:pb-10 space-y-[18px]">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 pb-1 text-[12.5px] text-[#7C878E]">
          <Link href="/businesses-directory" className="hover:text-fiche-accent">
            Businesses
          </Link>
          {catName && (
            <>
              <span aria-hidden="true" className="opacity-50">/</span>
              <span>{catName}</span>
            </>
          )}
          <span aria-hidden="true" className="opacity-50">/</span>
          <span aria-current="page" className="font-medium text-[#4C5A63]">{biz.name}</span>
        </nav>

        {/* ══════════════ HERO ══════════════ */}
        <div className="relative overflow-hidden rounded-[18px] border border-fiche-border bg-white shadow-[0_1px_2px_rgba(31,26,20,.05),0_18px_40px_-24px_rgba(31,26,20,.35)]">
          {(biz.cover_url || isOwner) && (
            <div
              data-testid="business-cover"
              className="relative h-40 md:h-52 w-full overflow-hidden bg-gradient-to-br from-fiche-soft via-fiche-border to-fiche-soft"
            >
              {biz.cover_url && (
                <img
                  src={biz.cover_url}
                  alt={`${biz.name} cover`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {isOwner && (
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={mediaBusy !== null}
                        data-testid="business-cover-menu"
                        className="gap-2 bg-white/90 text-slate-900 shadow hover:bg-white"
                      >
                        {mediaBusy === "cover" ? (
                          <Upload className="h-4 w-4 animate-pulse" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        Cover photo
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => coverInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        {biz.cover_url ? "Change cover photo" : "Add cover photo"}
                      </DropdownMenuItem>
                      {biz.cover_url && (
                        <DropdownMenuItem
                          onSelect={() => void removeMedia("cover")}
                          className="text-red-600 focus:text-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove cover photo
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {isOwner && (
                <input
                  ref={coverInputRef}
                  type="file"
                  accept={MEDIA_ACCEPT}
                  onChange={handleMediaFileChange("cover")}
                  className="hidden"
                />
              )}
            </div>
          )}
          <div className="relative p-[clamp(20px,3vw,32px)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(680px_240px_at_88%_-30%,var(--fiche-soft,#f9fafb),transparent_70%)]"
            />
            <div className="relative flex gap-[clamp(14px,2.4vw,24px)] items-start">
              <div className="relative flex-shrink-0">
                <div className="flex h-[clamp(64px,9vw,84px)] w-[clamp(64px,9vw,84px)] items-center justify-center overflow-hidden rounded-[20px] border border-fiche-border bg-gradient-to-br from-fiche-soft via-[#FBF7F1] to-fiche-soft text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_10px_22px_-16px_rgba(31,26,20,.8)]">
                  {biz.logo_url ? (
                    <img
                      src={biz.logo_url}
                      alt={biz.name}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span>{avatarEmoji}</span>
                  )}
                </div>
                {isVerified && !isOwner && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-fiche-border bg-white shadow-sm"
                  >
                    <CheckCircle className="h-3 w-3 text-[#0E7A58]" strokeWidth={2.6} />
                  </span>
                )}
                {isOwner && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={mediaBusy !== null}
                          aria-label="Logo options"
                          title="Logo options"
                          data-testid="business-logo-menu"
                          className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-fiche-border shadow-md hover:bg-fiche-soft disabled:opacity-60"
                        >
                          {mediaBusy === "logo" ? (
                            <Upload className="h-4 w-4 text-fiche-accent animate-pulse" />
                          ) : (
                            <Camera className="h-4 w-4 text-fiche-accent" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onSelect={() => logoInputRef.current?.click()}>
                          <Upload className="mr-2 h-4 w-4" />
                          {biz.logo_url ? "Change logo" : "Add logo"}
                        </DropdownMenuItem>
                        {biz.logo_url && (
                          <DropdownMenuItem
                            onSelect={() => void removeMedia("logo")}
                            className="text-red-600 focus:text-red-700"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove logo
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept={MEDIA_ACCEPT}
                      onChange={handleMediaFileChange("logo")}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Name + badges */}
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-fraunces text-[clamp(1.7rem,4.4vw,2.6rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-[#1E2A32]">
                    {biz.name}
                  </h1>
                  {isVerified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            aria-label="Verified listing"
                            className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-fiche-border bg-fiche-soft"
                          >
                            <CheckCircle className="h-3 w-3 text-fiche-accent" strokeWidth={2.6} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Verified Business</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {biz.is_advertiser && (
                    <Badge className="border-fiche-border bg-fiche-soft text-fiche-accent">
                      <Sparkles className="h-3 w-3 mr-1" /> Promoted
                    </Badge>
                  )}
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {catName && (
                  <Badge className="border-fiche-border bg-fiche-soft text-fiche-accent">
                      {ui.icon} {catName}
                    </Badge>
                  )}
                  <Badge
                    className={
                      isActive
                        ? "border-[#BFE3D3] bg-[#DFF1E9] text-[#0E7A58]"
                        : "border-rose-200 bg-rose-50 text-rose-700"
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
                    <Badge className="border-fiche-border bg-fiche-soft text-[#4C5A63]">
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
                        className="border-fiche-border bg-white text-xs text-[#4C5A63]"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Lede + CTA row */}
                <div className="space-y-3">
                  {ledeText && (
                    <p className="max-w-[56ch] text-[14.5px] leading-[1.6] text-[#4C5A63]">
                      {ledeText}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="relative mt-5 flex flex-wrap gap-2">
              {biz.phone && (
                <Button
                  asChild
                  className="h-[38px] gap-[7px] rounded-[10px] bg-[#0E7A58] px-[15px] text-[13.5px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(14,122,88,.9)] hover:bg-[#0B6249]"
                >
                  <a href={`tel:${biz.phone}`}>
                    <Phone className="h-[15px] w-[15px]" /> Call now
                  </a>
                </Button>
              )}
              {biz.email && (
                <Button
                  asChild
                  variant="outline"
                  className="h-[38px] gap-[7px] rounded-[10px] border-[#DCCFBC] bg-white px-[15px] text-[13.5px] font-semibold text-[#1E2A32] hover:border-fiche-accent hover:bg-fiche-soft"
                >
                  <a href={`mailto:${biz.email}`}>
                    <Mail className="h-[15px] w-[15px]" /> Email
                  </a>
                </Button>
              )}
              {websiteHref && (
                <Button
                  asChild
                  variant="outline"
                  className="h-[38px] gap-[7px] rounded-[10px] border-[#DCCFBC] bg-white px-[15px] text-[13.5px] font-semibold text-[#1E2A32] hover:border-fiche-accent hover:bg-fiche-soft"
                >
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-[15px] w-[15px]" /> Website
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                className="hidden h-[38px] gap-[7px] rounded-[10px] border-[#DCCFBC] bg-white px-[15px] text-[13.5px] font-semibold text-[#1E2A32] hover:border-fiche-accent hover:bg-fiche-soft sm:inline-flex"
                onClick={() =>
                  copyToClipboard(
                    [biz.phone, biz.email, biz.address].filter(Boolean).join(" • "),
                  )
                }
              >
                <Copy className="h-[15px] w-[15px]" /> Copy details
              </Button>
              <Button
                variant="outline"
                className="h-[38px] gap-[7px] rounded-[10px] border-[#DCCFBC] bg-white px-[15px] text-[13.5px] font-semibold text-fiche-accent hover:bg-fiche-soft"
                onClick={() => setShowProfitModal(true)}
              >
                <Sparkles className="h-[15px] w-[15px]" /> Profit Window
              </Button>
            </div>

            {/* Stat strip */}
            <div className="relative mt-[22px] grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-2 gap-y-3.5 border-t border-fiche-border pt-[18px] md:grid-cols-[repeat(4,minmax(0,1fr))]">
              {[
                { k: "Rating", v: rating > 0 ? rating.toFixed(1) : "—", n: rating > 0 ? "Average rating" : "No ratings yet" },
                { k: "Services", v: String(serviceCount), n: serviceCount > 0 ? "Listed" : "None listed" },
                { k: "Reviews", v: String(reviewCount), n: reviewCount > 0 ? "Customer reviews" : "Be the first" },
                {
                  k: "Member since",
                  v: memberSince?.year ?? "—",
                  n: memberSince?.full ?? "",
                },
              ].map((stat, i) => (
                <div
                  key={stat.k}
                  className={`flex flex-col gap-0.5 pl-3.5 border-l border-fiche-border ${i === 0 ? "!pl-0 !border-l-0" : ""} ${i === 2 ? "max-md:!pl-0 max-md:!border-l-0" : ""}`}
                >
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#7C878E]">
                    {stat.k}
                  </span>
                  <span className="font-fraunces text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] tabular-nums text-[#1E2A32] sm:text-[22px]">
                    {stat.v}
                  </span>
                  <span className="text-[11.5px] text-[#7C878E]">{stat.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════ MAIN GRID ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_344px] gap-5 items-start">
          {/* ── Left Column ──────────────────────────────── */}
          <div className="min-w-0 space-y-5 max-lg:order-1">
            <div className="overflow-hidden rounded-[18px] border border-fiche-border bg-white shadow-[0_1px_2px_rgba(31,26,20,.05),0_18px_40px_-24px_rgba(31,26,20,.35)]">
            <Tabs defaultValue="about">
              <TabsList className="h-auto w-full justify-start gap-0.5 overflow-x-auto rounded-none border-b border-fiche-border bg-[#FBF7F1] px-2 pb-0 pt-2 [scrollbar-width:none]">
                {[
                  ["about", "About"],
                  ["details", "Details"],
                  ["reviews", "Reviews"],
                ].map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="relative rounded-b-none rounded-t-[9px] bg-transparent px-[15px] pb-[13px] pt-[11px] text-[13.5px] font-semibold text-[#7C878E] shadow-none transition-colors hover:bg-[#F3EBDF]/70 hover:text-[#1E2A32] data-[state=active]:bg-white data-[state=active]:text-fiche-accent data-[state=active]:shadow-none data-[state=active]:after:absolute data-[state=active]:after:inset-x-2.5 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-sm data-[state=active]:after:bg-fiche-accent"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="about" className="mt-0 space-y-6 p-[clamp(18px,2.6vw,26px)]">
            {/* About */}
            {biz.description && (
              <div>
                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.11em] text-[#7C878E]">
                  What they do
                </h3>
                <p className="max-w-[64ch] whitespace-pre-line text-[14.5px] leading-[1.7] text-[#4C5A63]">
                  {biz.description}
                </p>
              </div>
            )}

            {(catName || biz.location || attrs.type) && (
              <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px overflow-hidden rounded-xl border border-fiche-border bg-fiche-border">
                {[
                  ["Category", [catName, attrs.type].filter(Boolean).join(" · ")],
                  ["Based in", biz.location || ""],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="min-w-0 bg-white px-3.5 py-3">
                      <dt className="mb-[3px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#7C878E]">
                        {label}
                      </dt>
                      <dd className="m-0 break-words text-[13.5px] font-semibold text-[#1E2A32]">
                        {value}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}

            {/* Fiche Technique (tier + sector gated) */}
            <FicheTechnique
              business={biz}
              onEdit={canEditFiche ? () => setFicheEditorOpen(true) : undefined}
            />
            {canEditFiche && (
              <FicheEditor
                open={ficheEditorOpen}
                onOpenChange={setFicheEditorOpen}
                business={biz}
                onSaved={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["business", businessId],
                  });
                  toast({ title: "Fiche saved" });
                }}
              />
            )}

              </TabsContent>

              <TabsContent value="details" className="mt-0 space-y-6 p-[clamp(18px,2.6vw,26px)]">
            {/* Business Details / Attributes — FIXED safe array handling */}
            {Object.keys(attrs || {}).length === 0 && !(biz.services && biz.services.length > 0) && (
              <div className="flex items-center gap-3.5 rounded-[14px] border border-dashed border-[#DCCFBC] bg-[#FBF7F1] p-[18px]">
                <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-[#F3EBDF]">
                  <Package className="h-[17px] w-[17px] text-[#7C878E]" />
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#1E2A32]">No additional details yet</p>
                  <p className="mt-0.5 text-[12.5px] text-[#7C878E]">Services, products and other details appear here.</p>
                </div>
              </div>
            )}
            {attrs && Object.keys(attrs).length > 0 && (
              <Card className="text-[#1E2A32] bg-white border border-fiche-border shadow-sm rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-slate-700 flex items-center gap-2">
                    <Package className="h-5 w-5 text-fiche-accent" /> Business
                    Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {attrs.type && (
                      <div className="p-3 bg-white/5 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-700 uppercase">Type</p>
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          {attrs.type}
                        </p>
                      </div>
                    )}
                    {attrs.license && (
                      <div className="p-3 bg-white/5 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-700 uppercase">
                          License
                        </p>
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          {attrs.license}
                        </p>
                      </div>
                    )}
                    {attrs.capacity !== undefined && (
                      <div className="p-3 bg-white/5 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-700 uppercase">
                          Capacity
                        </p>
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          {attrs.capacity}
                        </p>
                      </div>
                    )}
                    {attrs.price !== undefined && (
                      <div className="p-3 bg-white/5 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-700 uppercase">
                          Price
                        </p>
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          ${attrs.price}
                        </p>
                      </div>
                    )}
                    {attrs.delivery !== undefined && (
                      <div className="p-3 bg-white/5 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-700 uppercase">
                          Delivery
                        </p>
                        <p className="text-sm font-medium text-slate-700 mt-1">
                          {attrs.delivery ? "✅ Available" : "❌ Not available"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Products - safeArray */}
                  {(() => {
                    const products = safeArray(attrs.products);
                    if (products.length > 0)
                      return (
                        <div className="mt-4">
                          <p className="text-xs text-slate-700 uppercase mb-2">
                            Products
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {products.map((p: string) => (
                              <Badge
                                key={p}
                                className="bg-white/10 border-slate-200 text-slate-700 text-xs"
                              >
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    return null;
                  })()}

                  {/* Brands - safeArray */}
                  {(() => {
                    const brands = safeArray(attrs.brands);
                    if (brands.length > 0)
                      return (
                        <div className="mt-4">
                          <p className="text-xs text-slate-700 uppercase mb-2">
                            Brands
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {brands.map((b: string) => (
                              <Badge
                                key={b}
                                className="bg-white/10 border-slate-200 text-slate-700 text-xs"
                              >
                                {b}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    return null;
                  })()}

                  {/* Services - safeArray */}
                  {(() => {
                    const services = safeArray(attrs.services);
                    if (services.length > 0)
                      return (
                        <div className="mt-4">
                          <p className="text-xs text-slate-700 uppercase mb-2">
                            Services
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {services.map((s: string) => (
                              <Badge
                                key={s}
                                className="bg-white/10 border-slate-200 text-slate-700 text-xs"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    return null;
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Services (from JOIN) — fixed null check */}
            {biz.services &&
              Array.isArray(biz.services) &&
              biz.services.length > 0 && (
                <Card className="text-[#1E2A32] bg-white border border-fiche-border shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-slate-700 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-fiche-accent" /> Services
                      ({biz.services.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {biz.services.map((svc) => (
                        <div
                          key={svc.id}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-slate-200 hover:bg-white/[0.07] transition-all hover:border-fiche-border"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {svc.name}
                            </p>
                            {svc.category && (
                              <p className="text-xs text-slate-700">
                                {svc.category}
                              </p>
                            )}
                          </div>
                          {svc.price !== undefined && svc.price !== null && (
                            <Badge className="border-fiche-border bg-fiche-soft text-fiche-accent">
                              ${svc.price}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              </TabsContent>

              <TabsContent value="reviews" className="mt-0 space-y-6 p-[clamp(18px,2.6vw,26px)]">
            {/* Reviews */}
            {biz.reviews && biz.reviews.length > 0 ? (
              <Card className="text-[#1E2A32] bg-white border border-fiche-border shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-slate-700 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-fiche-accent" /> Reviews
                    ({biz.reviews.length})
                  </CardTitle>
                  <CardDescription className="text-slate-700">
                    Average rating: {avgRating(biz.reviews).toFixed(1)} / 5
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {biz.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 bg-white/5 rounded-xl border border-slate-200 hover:bg-white/[0.07] transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < Math.round(review.rating) ? "fill-amber-400 text-amber-800" : "text-slate-600"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-700">
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                      {review.title && (
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          {review.title}
                        </p>
                      )}
                      {review.content && (
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {review.content}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="text-[#1E2A32] bg-white border border-fiche-border shadow-sm rounded-2xl">
                <CardContent className="py-10 text-center">
                  <MessageSquare className="mx-auto mb-3 h-6 w-6 text-[#7C878E]" />
                  <p className="font-medium text-[#1E2A32]">No reviews yet</p>
                  <p className="mt-1 text-sm text-[#4C5A63]">
                    Feedback from customers appears here.
                  </p>
                </CardContent>
              </Card>
            )}
              </TabsContent>
            </Tabs>
            </div>
            {/* Map Embed */}
            {biz.latitude && biz.longitude && (
              <Card className="text-[#1E2A32] bg-white border border-fiche-border shadow-sm rounded-2xl overflow-hidden group">
                <CardHeader>
                  <CardTitle className="text-slate-700 flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-fiche-accent" /> Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none z-10" />
                    <iframe
                      title="Business Location"
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(biz.longitude) - 0.01},${parseFloat(biz.latitude) - 0.01},${parseFloat(biz.longitude) + 0.01},${parseFloat(biz.latitude) + 0.01}&layer=mapnik&marker=${biz.latitude},${biz.longitude}`}
                      className="rounded-b-xl group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right Sidebar (1/3) ────────────────────────────── */}
          <div className="min-w-0 space-y-3.5 lg:sticky lg:top-[18px] self-start max-lg:order-2">
            {/* Contact */}
            <section className="rounded-2xl border border-fiche-border bg-white p-[18px] shadow-[0_1px_2px_rgba(31,26,20,.06)]">
              <div className="mb-3.5 flex items-center justify-between gap-2.5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7C878E]">
                  Contact
                </h2>
                <button
                  type="button"
                  aria-label="Copy contact info"
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] text-[#7C878E] transition-colors hover:bg-fiche-soft hover:text-fiche-accent"
                  onClick={() =>
                    copyToClipboard(
                      [biz.phone, biz.email, biz.address]
                        .filter(Boolean)
                        .join(" • "),
                    )
                  }
                >
                  <Copy className="h-[13px] w-[13px]" />
                </button>
              </div>
              {[
                biz.address && {
                  key: "address",
                  label: "Address",
                  icon: MapPin,
                  value: <>{biz.address}{biz.location && <span className="block text-[12.5px] font-normal text-[#7C878E]">{biz.location}</span>}</>,
                },
                biz.phone && {
                  key: "phone",
                  label: "Phone",
                  icon: Phone,
                  value: <a href={`tel:${biz.phone}`} className="hover:text-fiche-accent hover:underline underline-offset-2">{biz.phone}</a>,
                },
                biz.email && {
                  key: "email",
                  label: "Email",
                  icon: Mail,
                  value: <a href={`mailto:${biz.email}`} className="hover:text-fiche-accent hover:underline underline-offset-2">{biz.email}</a>,
                },
                websiteHref && {
                  key: "website",
                  label: "Website",
                  icon: Globe,
                  value: (
                    <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="hover:text-fiche-accent hover:underline underline-offset-2">
                      {websiteHref.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}
                    </a>
                  ),
                },
              ]
                .filter(Boolean)
                .map((row: any) => (
                  <div
                    key={row.key}
                    className="flex min-w-0 gap-[11px] border-t border-fiche-border py-[11px] first:border-t-0 first:pt-0"
                  >
                    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] border border-fiche-border bg-[#FBF7F1]">
                      <row.icon className="h-3.5 w-3.5 text-fiche-accent" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#7C878E]">
                        {row.label}
                      </div>
                      <div className="break-words text-[13.5px] font-medium leading-[1.45] text-[#1E2A32]">
                        {row.value}
                      </div>
                    </div>
                  </div>
                ))}
              {(biz.phone || mapsLink) && (
                <div className="mt-3.5 flex gap-2">
                  {biz.phone && (
                    <Button
                      asChild
                      className="h-9 flex-1 gap-[7px] rounded-[10px] bg-[#0E7A58] px-2.5 text-[12.5px] font-semibold text-white hover:bg-[#0B6249]"
                    >
                      <a href={`tel:${biz.phone}`}>
                        <Phone className="h-[15px] w-[15px]" /> Call
                      </a>
                    </Button>
                  )}
                  {mapsLink && (
                    <Button
                      asChild
                      variant="outline"
                      className="h-9 flex-1 gap-[7px] rounded-[10px] border-[#DCCFBC] bg-white px-2.5 text-[12.5px] font-semibold text-[#1E2A32] hover:bg-fiche-soft"
                    >
                      <a href={mapsLink} target="_blank" rel="noreferrer">
                        <MapPin className="h-[15px] w-[15px]" /> Directions
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </section>

            {/* Listing details */}
            <section className="rounded-2xl border border-fiche-border bg-white p-[18px] shadow-[0_1px_2px_rgba(31,26,20,.06)]">
              <div className="mb-3.5 flex items-center justify-between gap-2.5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7C878E]">
                  Listing details
                </h2>
              </div>
              <div className="flex flex-col text-[13px]">
                {[
                  {
                    k: "Status",
                    v: (
                      <span className={`inline-flex items-center gap-[5px] font-bold ${isActive ? "text-[#0E7A58]" : "text-rose-700"}`}>
                        {isActive ? <CheckCircle className="h-[11px] w-[11px]" strokeWidth={3} /> : <XCircle className="h-[11px] w-[11px]" strokeWidth={3} />}
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    ),
                  },
                  isVerified && { k: "Verified", v: "Yes" },
                  catName && { k: "Category", v: [catName, attrs.type].filter(Boolean).join(" · ") },
                  memberSince && { k: "Member since", v: memberSince.full },
                  { k: "Listing", v: `VI-${String(biz.id).padStart(4, "0")}` },
                ]
                  .filter(Boolean)
                  .map((row: any) => (
                    <div
                      key={row.k}
                      className="flex items-center justify-between gap-2.5 border-t border-fiche-border py-[9px] first:border-t-0 first:pt-0"
                    >
                      <span className="text-[#7C878E]">{row.k}</span>
                      <span className="text-right font-semibold text-[#1E2A32]">{row.v}</span>
                    </div>
                  ))}
                {biz.performance_score && parseFloat(biz.performance_score) > 0 && (
                  <div className="mt-2 border-t border-fiche-border pt-2.5">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-[#7C878E]">Performance Score</span>
                      <span className="font-semibold text-[#1E2A32]">
                        {parseFloat(biz.performance_score).toFixed(1)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(parseFloat(biz.performance_score) * 10, 100)}
                      className="h-1.5 bg-fiche-soft"
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* ══════════════ SUGGESTIONS ══════════════ */}
        {suggestions.length > 0 && (
          <div className="space-y-6 pt-4">
            <Separator className="bg-white/10" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-700 flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-fiche-accent animate-pulse" />{" "}
                  You Might Also Like
                </h2>
                <p className="text-sm text-slate-700 mt-1">
                  {catName
                    ? `Similar businesses in ${catName}`
                    : "Discover more businesses"}
                </p>
              </div>
              <Link href="/businesses-directory">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-slate-200 text-slate-700 hover:bg-white/10 gap-2 hover:border-fiche-border"
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
                    <Card className="text-[#1E2A32] bg-white border border-fiche-border shadow-sm hover:shadow-md hover:border-fiche-border transition-all duration-300 cursor-pointer group h-full rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-10 h-10 rounded-xl bg-fiche-soft flex items-center justify-center text-lg shadow-md border border-fiche-border group-hover:scale-110 transition-transform duration-300`}
                          >
                            {bizUI.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-700 truncate text-sm group-hover:text-fiche-accent transition-colors">
                              {biz.name}
                            </h3>
                            {biz.address && (
                              <p className="text-xs text-slate-700 mt-1 truncate">
                                📍 {biz.address}
                              </p>
                            )}
                            {bizCat && (
                              <Badge className="mt-2 text-xs bg-white/10 border-slate-200 text-slate-700">
                                {bizCat}
                              </Badge>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              {biz.rating && (
                                <span className="text-xs text-slate-700">
                                  ⭐{" "}
                                  {typeof biz.rating === "string"
                                    ? parseFloat(biz.rating).toFixed(1)
                                    : biz.rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-fiche-accent group-hover:translate-x-1 transition-all mt-1 flex-shrink-0" />
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
                    className="h-28 w-full rounded-xl bg-white/5 border border-slate-200"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════ PROFIT POPUP MODAL — Futuristic redesign ══════════════ */}
      {showProfitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto">
          {/* Backdrop with blur and graffiti effect */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowProfitModal(false)}
          />
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-20 left-10 text-9xl opacity-10 rotate-12 text-fiche-accent">
              ✪
            </div>
            <div className="absolute bottom-20 right-10 text-8xl opacity-10 -rotate-12 text-fiche-accent">
              ⌘
            </div>
          </div>

          <Card className="text-slate-900 relative max-w-2xl w-full bg-white backdrop-blur-2xl border border-fiche-border shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-fiche-accent" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-slate-700 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-fiche-accent animate-pulse" />
                  Profit Window — {biz.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-700 hover:text-slate-700 -mr-2 hover:bg-white/5"
                  onClick={() => setShowProfitModal(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
              <CardDescription className="text-slate-700">
                Monetisation toolkit — promotions, sponsorship, booking &
                analytics at a glance.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 text-sm text-slate-700">
              <p className="leading-relaxed bg-white/5 p-4 rounded-xl border border-slate-200">
                💎 This profit window is the revenue hub for{" "}
                <span className="text-fiche-accent font-semibold">{biz.name}</span>
                . Use it to configure offers, track conversion funnels, and
                manage sponsorship placements that turn page views into
                measurable revenue.
              </p>

              {/* Two-column feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Promotions */}
                <div className="p-4 rounded-xl bg-fiche-soft border border-fiche-border hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-fiche-accent" />
                    <h4 className="font-semibold text-fiche-accent">Promotions</h4>
                  </div>
                  <ul className="space-y-1.5 text-slate-700 text-xs">
                    <li>• Flash sale banners & countdown timers</li>
                    <li>• First-visit discount codes</li>
                    <li>• Seasonal bundle offers</li>
                    <li>• Referral reward programmes</li>
                  </ul>
                </div>

                {/* Booking & Leads */}
                <div className="p-4 rounded-xl bg-fiche-soft border border-fiche-border hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-fiche-accent" />
                    <h4 className="font-semibold text-fiche-accent">
                      Booking & Leads
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-slate-700 text-xs">
                    <li>• Inline booking calendar widget</li>
                    <li>• Quick-quote request form</li>
                    <li>• Live chat / WhatsApp redirect</li>
                    <li>• Lead capture with email drip</li>
                  </ul>
                </div>

                {/* Sponsorship */}
                <div className="p-4 rounded-xl bg-fiche-soft border border-fiche-border hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-fiche-accent" />
                    <h4 className="font-semibold text-fiche-accent">
                      Sponsorship
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-slate-700 text-xs">
                    <li>• Featured placement in directory</li>
                    <li>• Banner ad slots on sector pages</li>
                    <li>• "Promoted" badge & priority sort</li>
                    <li>• Cross-sell in suggestion cards</li>
                  </ul>
                </div>

                {/* Analytics */}
                <div className="p-4 rounded-xl bg-fiche-soft border border-fiche-border hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-fiche-accent" />
                    <h4 className="font-semibold text-fiche-accent">Analytics</h4>
                  </div>
                  <ul className="space-y-1.5 text-slate-700 text-xs">
                    <li>• Page-view & click-through rates</li>
                    <li>• Conversion funnel tracking</li>
                    <li>• Revenue attribution reports</li>
                    <li>• A/B test results for offers</li>
                  </ul>
                </div>
              </div>

              {/* Business quick stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-white/5 border border-slate-200">
                  <p className="text-lg font-bold text-slate-700">
                    {rating > 0 ? rating.toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-slate-700">Rating</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-slate-200">
                  <p className="text-lg font-bold text-slate-700">
                    {serviceCount}
                  </p>
                  <p className="text-xs text-slate-700">Services</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5 border border-slate-200">
                  <p className="text-lg font-bold text-slate-700">
                    {reviewCount}
                  </p>
                  <p className="text-xs text-slate-700">Reviews</p>
                </div>
              </div>

              {/* Info banner */}
              <div className="p-4 rounded-xl bg-fiche-soft border border-fiche-border text-fiche-accent text-xs leading-relaxed">
                💡 <span className="font-semibold">Coming soon:</span> Real
                promotional content, live pricing tiers, booking integrations,
                and conversion dashboards will replace these placeholders. Each
                card above will become an interactive module you can configure
                per business.
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-600">
                Profit Window v0.1 — preview
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="text-slate-700 hover:text-slate-700"
                  onClick={() => setShowProfitModal(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-fiche-accent text-white hover:bg-fiche-accent hover:brightness-90 gap-2 shadow-lg"
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

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCountry } from "@/contexts/CountryContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Play,
  Pause,
  Tv,
  Monitor,
  Grid3X3,
  Maximize,
  Minimize,
  Building,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  Zap,
  ChevronRight,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// ─── Industry UI ────────────────────────────────────────────────────────────
const INDUSTRY_UI: Record<
  string,
  { icon: string; gradient: string; bg: string }
> = {
  restaurant: {
    icon: "🍽️",
    gradient: "from-orange-500 to-red-500",
    bg: "bg-orange-500/10",
  },
  hotel: {
    icon: "🏨",
    gradient: "from-blue-500 to-indigo-500",
    bg: "bg-blue-500/10",
  },
  commerce: {
    icon: "🛒",
    gradient: "from-emerald-500 to-green-500",
    bg: "bg-emerald-500/10",
  },
  construction: {
    icon: "🏗️",
    gradient: "from-amber-500 to-yellow-600",
    bg: "bg-amber-500/10",
  },
  automotive: {
    icon: "🚗",
    gradient: "from-slate-500 to-zinc-600",
    bg: "bg-slate-500/10",
  },
  finance: {
    icon: "💰",
    gradient: "from-green-500 to-emerald-600",
    bg: "bg-green-500/10",
  },
  entertainment: {
    icon: "🎭",
    gradient: "from-purple-500 to-pink-500",
    bg: "bg-purple-500/10",
  },
  health: {
    icon: "🏥",
    gradient: "from-red-500 to-rose-500",
    bg: "bg-red-500/10",
  },
  technology: {
    icon: "💻",
    gradient: "from-cyan-500 to-blue-500",
    bg: "bg-cyan-500/10",
  },
  communication: {
    icon: "📡",
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-500/10",
  },
};
const DEFAULT_UI = {
  icon: "🏢",
  gradient: "from-slate-500 to-slate-700",
  bg: "bg-slate-500/10",
};

function getUI(cat: string | null | undefined) {
  if (!cat) return DEFAULT_UI;
  const slug = cat.toLowerCase().replace(/\s+/g, "-");
  return (
    (
      INDUSTRY_UI as Record<
        string,
        { icon: string; gradient: string; bg: string }
      >
    )[slug] || DEFAULT_UI
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface Business {
  id: number;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  location?: string;
  is_verified?: boolean;
  is_advertiser?: boolean;
  is_active?: boolean;
  category_name?: string;
  categoryName?: string;
  rating?: number | string;
  [key: string]: any;
}

// Auto-play speed presets
const SPEED_OPTIONS = [
  { label: "Slow", ms: 8000, icon: "🐢" },
  { label: "Normal", ms: 5000, icon: "⚡" },
  { label: "Fast", ms: 3000, icon: "🚀" },
];

// ═══════════════════════════════════════════════════════════════════════════
// ANNUAIRE TV PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function AnnuaireTV() {
  // ── State
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1); // index into SPEED_OPTIONS
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { selectedCountry } = useCountry();
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch businesses
  const { data: allBusinesses = [], isLoading } = useQuery<Business[]>({
    queryKey: ["annuaire-tv-businesses", selectedCountry],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (selectedCountry) params.set("countryCode", selectedCountry);
      const res = await fetch(
        `${API_BASE_URL}/api/businesses?${params.toString()}`,
      );
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
    staleTime: 120000,
  });

  // ── Extract unique categories
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    allBusinesses.forEach((b: Business) => {
      const cat = b.category_name || b.categoryName;
      if (cat) catSet.add(cat);
    });
    return Array.from(catSet).sort();
  }, [allBusinesses]);

  // ── Filter businesses
  const businesses = useMemo(() => {
    if (!categoryFilter) return allBusinesses;
    return allBusinesses.filter((b: Business) => {
      const cat = b.category_name || b.categoryName || "";
      return cat === categoryFilter;
    });
  }, [allBusinesses, categoryFilter]);

  // ── Carousel sync
  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // ── Auto-play
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || !api || businesses.length === 0) return;

    intervalRef.current = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0); // loop back to start
      }
    }, SPEED_OPTIONS[speed].ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [api, isPlaying, speed, businesses.length]);

  // ── Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        api?.scrollNext();
      } else if (e.key === "ArrowLeft") {
        api?.scrollPrev();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [api, toggleFullscreen]);

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={containerRef}
      className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    >
      {/* ── Top Bar ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Tv className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                Annuaire TV
              </h1>
              <p className="text-xs text-slate-500">
                {businesses.length} business
                {businesses.length !== 1 ? "es" : ""}
                {categoryFilter && ` in ${categoryFilter}`}
              </p>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                api?.scrollTo(0);
              }}
              className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
            >
              <option value="" className="bg-slate-900">
                All Categories
              </option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {cat}
                </option>
              ))}
            </select>

            <Separator
              orientation="vertical"
              className="h-6 bg-white/10 hidden sm:block"
            />

            {/* Play / Pause */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`gap-1.5 ${
                isPlaying
                  ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="hidden sm:inline text-xs">
                {isPlaying ? "Pause" : "Play"}
              </span>
            </Button>

            {/* Speed */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSpeed((s) => (s + 1) % SPEED_OPTIONS.length)}
              className="text-slate-400 hover:text-slate-200 hover:bg-white/5 gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs">{SPEED_OPTIONS[speed].label}</span>
            </Button>

            <Separator
              orientation="vertical"
              className="h-6 bg-white/10 hidden sm:block"
            />

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-slate-400 hover:text-slate-200 hover:bg-white/5"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Right: Nav links */}
          <div className="flex items-center gap-2">
            <Link href="/businesses-directory">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200 hover:bg-white/5 gap-1.5"
              >
                <Grid3X3 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Directory</span>
              </Button>
            </Link>
            <Link href="/geo-admin">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200 hover:bg-white/5 gap-1.5"
              >
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Geo Admin</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Carousel Area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8">
        {isLoading ? (
          <div className="w-full max-w-4xl space-y-6">
            <Skeleton className="h-[400px] w-full rounded-3xl bg-white/5 border border-white/10" />
            <div className="flex justify-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-2 w-8 rounded-full bg-white/10"
                />
              ))}
            </div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center space-y-4">
            <Building className="h-16 w-16 text-slate-600 mx-auto" />
            <h2 className="text-xl font-bold text-slate-300">
              No businesses found
            </h2>
            <p className="text-sm text-slate-500">
              {categoryFilter
                ? "Try a different category"
                : "Business data is unavailable"}
            </p>
            {categoryFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryFilter("")}
                className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Show all
              </Button>
            )}
          </div>
        ) : (
          <>
            <Carousel
              setApi={setApi}
              opts={{ loop: true, align: "center" }}
              className="w-full max-w-4xl"
            >
              <CarouselContent>
                {businesses.map((biz: Business) => {
                  const cat = biz.category_name || biz.categoryName || "";
                  const ui = getUI(cat);
                  const ratingVal = biz.rating
                    ? typeof biz.rating === "string"
                      ? parseFloat(biz.rating)
                      : biz.rating
                    : 0;

                  return (
                    <CarouselItem key={biz.id}>
                      <div className="p-2">
                        <Link href={`/business/${biz.id}`}>
                          <Card className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl hover:bg-white/[0.07] transition-all duration-700 cursor-pointer group rounded-3xl overflow-hidden">
                            <CardContent className="p-0">
                              {/* Gradient header bar */}
                              <div
                                className={`h-2 bg-gradient-to-r ${ui.gradient}`}
                              />

                              <div className="p-8 md:p-12 space-y-6">
                                {/* Top row: icon + name */}
                                <div className="flex items-start gap-5">
                                  <div
                                    className={`flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${ui.gradient} flex items-center justify-center text-4xl shadow-xl border border-white/20 group-hover:scale-110 transition-transform duration-500`}
                                  >
                                    {ui.icon}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <h2 className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight group-hover:text-white transition-colors leading-tight">
                                      {biz.name}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {cat && (
                                        <Badge className="bg-white/10 border-white/20 text-slate-200">
                                          {ui.icon} {cat}
                                        </Badge>
                                      )}
                                      {biz.is_verified && (
                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                          <ShieldCheck className="h-3 w-3 mr-1" />{" "}
                                          Verified
                                        </Badge>
                                      )}
                                      {biz.is_advertiser && (
                                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                                          <Sparkles className="h-3 w-3 mr-1" />{" "}
                                          Promoted
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Description */}
                                {biz.description && (
                                  <p className="text-slate-400 text-base leading-relaxed line-clamp-3">
                                    {biz.description}
                                  </p>
                                )}

                                {/* Rating */}
                                {ratingVal > 0 && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-5 w-5 ${
                                            i < Math.round(ratingVal)
                                              ? "fill-amber-400 text-amber-400"
                                              : "text-slate-700"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-sm font-medium text-slate-300">
                                      {ratingVal.toFixed(1)}
                                    </span>
                                  </div>
                                )}

                                {/* Contact info grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {biz.address && (
                                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                                      <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                      <span className="text-sm text-slate-300 truncate">
                                        {biz.address}
                                      </span>
                                    </div>
                                  )}
                                  {biz.phone && (
                                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                                      <Phone className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                      <span className="text-sm text-slate-300 truncate">
                                        {biz.phone}
                                      </span>
                                    </div>
                                  )}
                                  {biz.email && (
                                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                                      <Mail className="h-4 w-4 text-rose-400 flex-shrink-0" />
                                      <span className="text-sm text-slate-300 truncate">
                                        {biz.email}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Footer: view prompt */}
                                <div className="flex items-center justify-between pt-2">
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    {biz.is_active !== undefined && (
                                      <Badge
                                        className={
                                          biz.is_active
                                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                        }
                                      >
                                        {biz.is_active ? "Active" : "Inactive"}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-amber-400/80 group-hover:text-amber-300 transition-colors">
                                    <span className="text-sm font-medium">
                                      View Details
                                    </span>
                                    <ExternalLink className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>

              {/* Nav arrows */}
              <CarouselPrevious className="bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-100 -left-4 sm:-left-14" />
              <CarouselNext className="bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-100 -right-4 sm:-right-14" />
            </Carousel>

            {/* ── Progress & Slide Indicator ──────────────────────────── */}
            <div className="mt-8 flex flex-col items-center gap-3">
              {/* Dots / Progress bar */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-md">
                {businesses.length <= 20 ? (
                  businesses.map((_: Business, i: number) => (
                    <button
                      key={i}
                      onClick={() => api?.scrollTo(i)}
                      className={`h-2 rounded-full transition-all duration-500 ${
                        i === current
                          ? "w-8 bg-amber-400"
                          : "w-2 bg-white/20 hover:bg-white/40"
                      }`}
                    />
                  ))
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-48 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${((current + 1) / businesses.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Counter & Status */}
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="font-mono tabular-nums">
                  <span className="text-slate-200 font-bold">
                    {current + 1}
                  </span>
                  <span className="mx-1">/</span>
                  <span>{businesses.length}</span>
                </span>
                <Separator orientation="vertical" className="h-4 bg-white/10" />
                <div className="flex items-center gap-1.5">
                  {isPlaying ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400">
                        Auto • {SPEED_OPTIONS[speed].label}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-slate-500" />
                      <span>Paused</span>
                    </>
                  )}
                </div>
              </div>

              {/* Keyboard hint */}
              <p className="text-xs text-slate-600 mt-2">
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-500">
                  Space
                </kbd>{" "}
                play/pause{" · "}
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-500">
                  ←
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-500">
                  →
                </kbd>{" "}
                navigate{" · "}
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-slate-500">
                  F
                </kbd>{" "}
                fullscreen
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

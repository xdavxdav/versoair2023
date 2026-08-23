import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItemScale,
  defaultViewport,
} from "@/lib/animations";
import {
  Search,
  MapPin,
  Star,
  Phone,
  Globe,
  Mail,
  Briefcase,
  Award,
  Zap,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Artisan {
  id: number;
  name: string;
  category: string | null;
  cityName: string | null;
  countryCode: string | null;
  rating: string | null;
  reviewCount: number | null;
  logoUrl: string | null;
  profileImageUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  slug: string | null;
  metadata: Record<string, unknown>;
}

export default function ArtisansDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchArtisans = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ accountType: "artisan", limit: "60" });
        if (searchQuery) params.set("q", searchQuery);
        const res = await fetch(`/api/profiles/search?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setArtisans(data.data ?? []);
      } catch (err: any) {
        if (err.name !== "AbortError") setError("Could not load artisans.");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchArtisans, searchQuery ? 300 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-12 md:py-16">
        <div className="max-w-[95vw] mx-auto px-4">
          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Meet Our Artisans
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="text-lg text-emerald-50 max-w-2xl"
          >
            Discover talented craftspeople and artisans from across Ivory Coast.
            Each artisan brings unique skills, cultural heritage, and a passion
            for their craft.
          </motion.p>
          <div className="flex items-center gap-2 mt-6 overflow-x-auto">
            <Link href="/">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                🏠 Accueil
              </span>
            </Link>
            <Link href="/programs">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                🎭 Programmes
              </span>
            </Link>
            <Link href="/communities">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                👥 Communautés
              </span>
            </Link>
            <Link href="/artist-portal">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                🎵 Portail Artiste
              </span>
            </Link>
            <Link href="/divertissement">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                🎪 Divertissement
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[95vw] mx-auto px-4 py-12">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, location, or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Results Count */}
        <p className="text-gray-600 mb-6">
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</span>
          ) : (
            <>Found <strong>{artisans.length}</strong> {artisans.length === 1 ? "artisan" : "artisans"}</>
          )}
        </p>

        {/* Error state */}
        {error && (
          <Card className="text-center py-8 border-0 shadow-lg bg-red-50 mb-6">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => setSearchQuery("")} variant="outline" className="mt-3">Retry</Button>
          </Card>
        )}

        {/* Artisans Grid */}
        {!loading && !error && artisans.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {artisans.map((artisan) => (
              <motion.div
                key={artisan.id}
                variants={staggerItemScale}
                whileHover={{ y: -6, scale: 1.02 }}
              >
                <Card className="hover:shadow-xl transition-all border-0 shadow-lg overflow-hidden h-full">
                  <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <CardTitle className="text-lg text-gray-900">
                          {artisan.name}
                        </CardTitle>
                        {artisan.category && (
                          <CardDescription className="text-emerald-700 font-medium">
                            {artisan.category}
                          </CardDescription>
                        )}
                      </div>
                      {artisan.rating != null && (
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-sm text-gray-900">
                            {parseFloat(artisan.rating).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {(artisan.cityName || artisan.countryCode) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        {[artisan.cityName, artisan.countryCode].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3">
                    {/* Contact Info */}
                    <div className="space-y-2 pt-1">
                      {artisan.phone && (
                        <a
                          href={`tel:${artisan.phone}`}
                          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          {artisan.phone}
                        </a>
                      )}
                      {artisan.email && (
                        <a
                          href={`mailto:${artisan.email}`}
                          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          {artisan.email}
                        </a>
                      )}
                    </div>

                    {artisan.reviewCount != null && artisan.reviewCount > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          {artisan.reviewCount} reviews
                        </span>
                      </div>
                    )}

                    <Link href="/artisan-workshops">
                      <button className="w-full mt-3 group bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden">
                        <span className="relative z-10 flex items-center gap-2">
                          <Zap className="h-4 w-4 animate-pulse" />
                          Partake in Workshops
                        </span>
                        <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                      </button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : !loading && !error ? (
          <Card className="text-center py-12 border-0 shadow-lg bg-gray-50">
            <Award className="h-12 w-12 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchQuery ? "No artisans found" : "Artisan Directory Ready"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "Artisan profiles will appear here as craftspeople join the platform."}
            </p>
            {searchQuery && (
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear Search
              </Button>
            )}
          </Card>
        ) : null}

        {/* Support Section */}
        <div className="mt-16 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl p-8 border border-emerald-200">
          <h2 className="text-2xl font-bold text-emerald-900 mb-3">
            Support Our Artisans
          </h2>
          <p className="text-emerald-800 mb-4">
            Every purchase directly supports artisans and their families. Help
            preserve cultural heritage and empower communities across Ivory
            Coast.
          </p>
          <Link href="/support">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Learn About Our Mission
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

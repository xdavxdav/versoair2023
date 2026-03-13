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
  id: string;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  reviews: number;
  image?: string;
  phone?: string;
  email?: string;
  yearsOfExperience?: number;
  specializations: string[];
}

// Artisan data — populated as craftspeople join the platform
const ARTISANS: Artisan[] = [];

export default function ArtisansDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [filteredArtisans, setFilteredArtisans] = useState(ARTISANS);

  const specialties = ["all", ...new Set(ARTISANS.map((a) => a.specialty))];

  useEffect(() => {
    let filtered = ARTISANS;

    // Filter by specialty
    if (selectedSpecialty !== "all") {
      filtered = filtered.filter((a) => a.specialty === selectedSpecialty);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
          a.location.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
          a.specialty.toLowerCase().startsWith(searchQuery.toLowerCase()),
      );
    }

    setFilteredArtisans(filtered);
  }, [searchQuery, selectedSpecialty]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
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
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
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

          {/* Specialty Filter */}
          <div className="flex flex-wrap gap-2">
            {specialties.map((specialty) => (
              <button
                key={specialty}
                onClick={() => setSelectedSpecialty(specialty)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  selectedSpecialty === specialty
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {specialty === "all" ? "All Specialties" : specialty}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <p className="text-gray-600 mb-6">
          Found <strong>{filteredArtisans.length}</strong>{" "}
          {filteredArtisans.length === 1 ? "artisan" : "artisans"}
        </p>

        {/* Artisans Grid */}
        {filteredArtisans.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredArtisans.map((artisan) => (
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
                        <CardDescription className="text-emerald-700 font-medium">
                          {artisan.specialty}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-sm text-gray-900">
                          {artisan.rating}
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      {artisan.location}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3">
                    {/* Experience */}
                    {artisan.yearsOfExperience && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Award className="h-4 w-4 text-emerald-600" />
                        <span>
                          {artisan.yearsOfExperience} years of experience
                        </span>
                      </div>
                    )}

                    {/* Specializations */}
                    <div className="flex flex-wrap gap-2">
                      {artisan.specializations.map((spec, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 pt-3 border-t border-gray-200">
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

                    {/* Reviews & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-xs text-gray-500">
                        {artisan.reviews} reviews
                      </span>
                    </div>

                    {/* Partake Button */}
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
        ) : (
          <Card className="text-center py-12 border-0 shadow-lg bg-gray-50">
            <Award className="h-12 w-12 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {ARTISANS.length === 0 &&
              !searchQuery &&
              selectedSpecialty === "all"
                ? "Artisan Directory Ready"
                : "No artisans found"}
            </h3>
            <p className="text-gray-500 mb-4">
              {ARTISANS.length === 0 &&
              !searchQuery &&
              selectedSpecialty === "all"
                ? "Artisan profiles will appear here as craftspeople join the platform."
                : "Try adjusting your search or filter criteria"}
            </p>
            {(searchQuery || selectedSpecialty !== "all") && (
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSpecialty("all");
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            )}
          </Card>
        )}

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

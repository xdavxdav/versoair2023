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
  Users,
  MapPin,
  Globe,
  Heart,
  MessageCircle,
  Zap,
  Search,
  ChevronRight,
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

interface Community {
  id: string;
  name: string;
  region: string;
  category: string;
  members: number;
  focus: string;
  image?: string;
  description: string;
  activities: string[];
}

const COMMUNITIES: Community[] = [
  {
    id: "1",
    name: "Abidjan Textile Collective",
    region: "Abidjan",
    category: "Textiles",
    members: 245,
    focus: "Traditional weaving and fabric arts",
    description:
      "A vibrant collective of weavers preserving traditional techniques while innovating with contemporary designs.",
    activities: [
      "Weekly workshops",
      "Market sales",
      "Cultural exhibitions",
      "Skill training",
    ],
  },
  {
    id: "2",
    name: "Yamoussoukro Ceramics Guild",
    region: "Yamoussoukro",
    category: "Ceramics",
    members: 156,
    focus: "Pottery and clay crafts",
    description:
      "Master potters teaching the next generation while creating stunning handcrafted pieces.",
    activities: [
      "Pottery classes",
      "Exhibitions",
      "International orders",
      "Apprenticeships",
    ],
  },
  {
    id: "3",
    name: "Korhogo Carvers' Association",
    region: "Korhogo",
    category: "Wood Carving",
    members: 189,
    focus: "Traditional wood sculpture",
    description:
      "Ancient wood carving traditions passed down through families, creating iconic African art.",
    activities: [
      "Carving demonstrations",
      "Art shows",
      "Museum partnerships",
      "Youth programs",
    ],
  },
  {
    id: "4",
    name: "Bouaké Metalwork Artisans",
    region: "Bouaké",
    category: "Metalwork",
    members: 127,
    focus: "Metal arts and sculpture",
    description:
      "Skilled metalworkers creating decorative and functional pieces using traditional techniques.",
    activities: [
      "Forging workshops",
      "Large commissions",
      "Art festivals",
      "Technical training",
    ],
  },
  {
    id: "5",
    name: "San Pédro Leather Craftspeople",
    region: "San Pédro",
    category: "Leather Work",
    members: 98,
    focus: "Leather goods and accessories",
    description:
      "Dedicated artisans crafting high-quality leather products with traditional methods.",
    activities: [
      "Leather classes",
      "Market participation",
      "Custom orders",
      "Sustainable practices",
    ],
  },
  {
    id: "6",
    name: "Daloa Jewelry Makers",
    region: "Daloa",
    category: "Jewelry",
    members: 112,
    focus: "Traditional and contemporary jewelry",
    description:
      "Gold, silver, and beaded jewelry artisans creating stunning wearable art.",
    activities: [
      "Design workshops",
      "Jewelry shows",
      "International sales",
      "Apprenticeships",
    ],
  },
];

export default function Communities() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filteredCommunities, setFilteredCommunities] = useState(COMMUNITIES);

  const categories = ["all", ...new Set(COMMUNITIES.map((c) => c.category))];

  const filterCommunities = () => {
    let filtered = COMMUNITIES;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((c) => c.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
          c.region.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
          c.focus.toLowerCase().startsWith(searchQuery.toLowerCase()),
      );
    }

    setFilteredCommunities(filtered);
  };

  useEffect(() => {
    filterCommunities();
  }, [searchQuery, selectedCategory]);

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
            Artisan Communities
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="text-lg text-emerald-50 max-w-2xl"
          >
            Explore local artisan collectives and communities across Ivory
            Coast. Connect, collaborate, and support traditional crafts.
          </motion.p>
          <div className="flex items-center gap-2 mt-6 overflow-x-auto">
            <Link href="/">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                🏠 Accueil
              </span>
            </Link>
            <Link href="/artisans">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                🎨 Artisans
              </span>
            </Link>
            <Link href="/programs">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                🎭 Programmes
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
        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search communities by name, region, or focus area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {category === "all" ? "All Categories" : category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <p className="text-gray-600 mb-6">
          Found <strong>{filteredCommunities.length}</strong>{" "}
          {filteredCommunities.length === 1 ? "community" : "communities"}
        </p>

        {/* Communities Grid */}
        {filteredCommunities.length > 0 ? (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          >
            {filteredCommunities.map((community) => (
              <motion.div
                key={community.id}
                variants={staggerItemScale}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:shadow-xl transition-all border-0 shadow-lg overflow-hidden group h-full">
                  {/* Header with category badge */}
                  <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 h-2" />

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {community.name}
                        </CardTitle>
                        <CardDescription className="text-emerald-600 font-medium mt-1">
                          {community.focus}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Location & Category */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        {community.region}
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        {community.category}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Description */}
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {community.description}
                    </p>

                    {/* Members Count */}
                    <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                      <Users className="h-4 w-4" />
                      <span>{community.members} active members</span>
                    </div>

                    {/* Activities */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">
                        Activities
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {community.activities
                          .slice(0, 2)
                          .map((activity, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                            >
                              {activity}
                            </span>
                          ))}
                        {community.activities.length > 2 && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            +{community.activities.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <Link href="/artisan-workshops" className="flex-1">
                        <button className="w-full group bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 text-sm flex items-center justify-center gap-1 relative overflow-hidden">
                          <span className="relative z-10 flex items-center gap-1">
                            <Zap className="h-3 w-3 animate-pulse" />
                            Partake
                          </span>
                        </button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-emerald-200 hover:bg-emerald-50"
                      >
                        <Heart className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card className="text-center py-12 border-0 shadow-lg bg-gray-50">
            <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No communities found
            </h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </Card>
        )}

        {/* How to Join Section */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
        >
          <Card className="border-0 shadow-lg overflow-hidden mb-12">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-8 border-b border-emerald-200">
              <h2 className="text-2xl font-bold text-emerald-900">
                How to Join a Community
              </h2>
            </div>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    number: "1",
                    title: "Find Your Community",
                    desc: "Browse our list and find a community that matches your interests and location.",
                  },
                  {
                    number: "2",
                    title: "Get in Touch",
                    desc: "Contact the community leaders through email or visit their workshops.",
                  },
                  {
                    number: "3",
                    title: "Participate",
                    desc: "Join workshops, share skills, and become part of the artisan network.",
                  },
                ].map((step, idx) => (
                  <div key={idx} className="text-center">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                      {step.number}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{step.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Support Section */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-8 text-white"
        >
          <div className="max-w-2xl mx-auto text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-emerald-100" />
            <h2 className="text-3xl font-bold mb-4">
              Strengthen Our Communities
            </h2>
            <p className="text-emerald-50 mb-6">
              Support artisan communities by purchasing their crafts, attending
              workshops, and sharing their stories.
            </p>
            <Link href="/artisans">
              <Button className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold">
                Discover Artisans <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

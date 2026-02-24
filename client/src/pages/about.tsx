"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Building,
  Home,
  Hotel,
  Car,
  Music,
  Factory,
  ShoppingBag,
  Banknote,
  Globe,
  Users,
  Award,
  TrendingUp,
  Shield,
  ChevronRight,
  Sparkles,
  Zap,
  Heart,
  Star,
  MapPin,
  Briefcase,
  BarChart3,
  Lightbulb,
  Rocket,
  CheckCircle,
  Database,
  Activity,
  Stethoscope,
  Gamepad2,
} from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ScrollToTop from "@/components/ScrollToTop";
import { useAboutStats } from "@/hooks/use-about-stats";

// Platform sectors – these match the actual routes in your app
const PLATFORM_SECTORS = [
  {
    id: "commerce",
    title: "Commerce & Retail",
    icon: ShoppingBag,
    color: "from-purple-500 to-pink-500",
    gradient: "bg-gradient-to-r from-purple-500 to-pink-500",
    description:
      "Business advertising, marketplace intelligence & retail analytics",
    route: "/commerce",
  },
  {
    id: "hotellerie",
    title: "Hospitality & Tourism",
    icon: Hotel,
    color: "from-blue-500 to-cyan-500",
    gradient: "bg-gradient-to-r from-blue-500 to-cyan-500",
    description: "Accommodation listings, vacation rentals & hospitality data",
    route: "/hotellerie",
  },
  {
    id: "automobile",
    title: "Automotive",
    icon: Car,
    color: "from-orange-500 to-red-500",
    gradient: "bg-gradient-to-r from-orange-500 to-red-500",
    description: "Vehicle marketplace, dealership directory & auto analytics",
    route: "/automobile",
  },
  {
    id: "batiment",
    title: "Construction & BTP",
    icon: Factory,
    color: "from-amber-500 to-yellow-500",
    gradient: "bg-gradient-to-r from-amber-500 to-yellow-500",
    description:
      "Building contractors, materials suppliers & construction projects",
    route: "/batiment",
  },
  {
    id: "finances",
    title: "Finance & Banking",
    icon: Banknote,
    color: "from-emerald-500 to-teal-500",
    gradient: "bg-gradient-to-r from-emerald-500 to-teal-500",
    description: "Financial services directory & banking sector intelligence",
    route: "/finances",
  },
  {
    id: "sante",
    title: "Health & Wellness",
    icon: Stethoscope,
    color: "from-rose-500 to-pink-500",
    gradient: "bg-gradient-to-r from-rose-500 to-pink-500",
    description: "Hospitals, clinics, doctors & healthcare providers directory",
    route: "/sante",
  },
  {
    id: "divertissement",
    title: "Entertainment",
    icon: Gamepad2,
    color: "from-violet-500 to-purple-500",
    gradient: "bg-gradient-to-r from-violet-500 to-purple-500",
    description:
      "Nightlife, cinemas, events & leisure activities across the city",
    route: "/divertissement",
  },
  {
    id: "businesses-directory",
    title: "Business Directory",
    icon: Building,
    color: "from-slate-600 to-slate-800",
    gradient: "bg-gradient-to-r from-slate-600 to-slate-800",
    description: "Comprehensive business listings & cross-sector search engine",
    route: "/businesses-directory",
  },
];

// Real technology stack
const TECH_STACK = [
  { name: "React 18", color: "text-cyan-400" },
  { name: "TypeScript", color: "text-blue-400" },
  { name: "PostgreSQL", color: "text-indigo-400" },
  { name: "Express.js", color: "text-green-400" },
  { name: "Vite", color: "text-yellow-400" },
  { name: "Drizzle ORM", color: "text-amber-400" },
  { name: "Tailwind CSS", color: "text-teal-400" },
  { name: "shadcn/ui", color: "text-white" },
  { name: "Socket.io", color: "text-slate-300" },
  { name: "Framer Motion", color: "text-purple-400" },
  { name: "TanStack Query", color: "text-red-400" },
  { name: "Chart.js", color: "text-pink-400" },
  { name: "Zod", color: "text-blue-300" },
  { name: "Lucide Icons", color: "text-orange-400" },
  { name: "Wouter", color: "text-emerald-400" },
  { name: "Nodemailer", color: "text-rose-400" },
];

// Animated Component
type FloatingProps = {
  children?: React.ReactNode;
  delay?: number;
  className?: string;
};
const FloatingElement = ({
  children,
  delay = 0,
  className = "",
}: FloatingProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={
        isInView
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 50, scale: 0.95 }
      }
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

// Sector Card Component
const SectorCard = ({
  sector,
  index,
}: {
  sector: (typeof PLATFORM_SECTORS)[0];
  index: number;
}) => {
  const Icon = sector.icon;

  return (
    <Link href={sector.route}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        viewport={{ once: true }}
        whileHover={{ y: -10, scale: 1.02 }}
        className="group relative cursor-pointer"
      >
        <Card className="h-full overflow-hidden border-0 bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
            style={{
              background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
            }}
          />
          <CardContent className="p-8 relative">
            <div className="flex items-start justify-between mb-6">
              <div className={`p-3 rounded-xl ${sector.gradient} shadow-lg`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>

            <h3 className="text-xl font-bold text-white mb-3">
              {sector.title}
            </h3>
            <p className="text-slate-300 text-sm mb-4">{sector.description}</p>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 group-hover:text-white/80 transition-colors">
                Explore sector →
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
};

// Feature Highlight Component
const FeatureHighlight = ({
  icon: Icon,
  title,
  description,
  delay = 0,
  color = "text-blue-400",
}: {
  icon: any;
  title: string;
  description: string;
  delay?: number;
  color?: string;
}) => (
  <FloatingElement delay={delay}>
    <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-br from-slate-800/30 to-slate-900/20 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 transition-colors group">
      <div className="p-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 group-hover:scale-110 transition-transform">
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-white mb-2">{title}</h4>
        <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  </FloatingElement>
);

// Helper to format numbers nicely
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function About() {
  const [activeSector, setActiveSector] = useState(() => {
    const saved = sessionStorage.getItem("aboutActiveSector");
    return saved || "commerce";
  });
  const heroRef = useRef(null);

  // Fetch live statistics from the database
  const {
    categoryStats,
    overallStats,
    musicStats,
    dbStats,
    topLocations,
    loading,
  } = useAboutStats();

  // Save tab state whenever it changes
  useEffect(() => {
    sessionStorage.setItem("aboutActiveSector", activeSector);
  }, [activeSector]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const handleScroll = () => {
      if (heroRef.current) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        (heroRef.current as HTMLElement).style.transform =
          `translateY(${rate}px)`;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute live stats for display
  const totalBusinesses = overallStats?.total_businesses ?? 0;
  const totalCategories = overallStats?.total_categories ?? 0;
  const avgRating = overallStats?.avg_rating ?? 0;
  const totalReviews = overallStats?.total_reviews ?? 0;
  const totalRecords = dbStats?.totalRecords ?? 0;
  const activeTables = dbStats?.activeTables ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Enhanced Hero with Parallax */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

        {/* Floating Orbs */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 200 + 50,
              height: Math.random() * 200 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, ${
                PLATFORM_SECTORS[i % PLATFORM_SECTORS.length].color
                  .replace("from-", "")
                  .replace("to-", "")
                  .split(" ")[0]
              }20, transparent 70%)`,
            }}
            animate={{
              y: [0, Math.random() * 100 - 50, 0],
              x: [0, Math.random() * 100 - 50, 0],
              scale: [1, 1.1 + Math.random() * 0.3, 1],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        <div
          ref={heroRef}
          className="relative z-10 max-w-7xl mx-auto px-4 py-20"
        >
          <div className="text-center">
            {/* Main Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all">
                <Sparkles className="h-3 w-3 mr-2" />
                Multi-Sector Intelligence Platform
              </Badge>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                  Verso Air
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Business Intelligence Ecosystem
                </span>
              </h1>
            </motion.div>

            {/* Description with real geographic context */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed"
            >
              Powering business directories and analytics across Abidjan & Côte
              d'Ivoire — connecting commerce, hospitality, automotive,
              construction, finance, health, and entertainment sectors through
              real-time data intelligence.
            </motion.p>

            {/* Quick Stats — ALL from live database */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-8 mb-12"
            >
              {[
                {
                  value: totalBusinesses,
                  label: "Registered Businesses",
                  icon: Building,
                },
                {
                  value: totalCategories,
                  label: "Business Categories",
                  icon: Database,
                },
                {
                  value: avgRating,
                  label: "Avg. Rating",
                  icon: Star,
                  suffix: "★",
                  isDecimal: true,
                },
                {
                  value: totalReviews,
                  label: "Total Reviews",
                  icon: Users,
                },
              ].map((stat, i) => {
                const Icon = stat.icon;
                const displayValue = loading
                  ? "..."
                  : stat.isDecimal
                    ? `${stat.value}${stat.suffix || ""}`
                    : `${formatNumber(stat.value)}${stat.suffix || ""}`;
                return (
                  <div key={i} className="text-center group">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Icon className="h-7 w-7 text-slate-300" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {displayValue}
                    </div>
                    <div className="text-sm text-slate-400">{stat.label}</div>
                  </div>
                );
              })}
            </motion.div>

            {/* CTA Buttons — real routes */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Link href="/businesses-directory">
                <Button className="px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all">
                  <Rocket className="mr-2 h-5 w-5" />
                  Browse All Businesses
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  className="px-8 py-6 text-lg border-slate-700 hover:bg-white/5 rounded-xl"
                >
                  Contact Us
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Live Data Dashboard Strip */}
      {!loading && (
        <section className="relative py-8 border-y border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-wrap justify-center gap-6 md:gap-12 text-center"
            >
              <div>
                <div className="text-lg font-bold text-emerald-400">
                  {totalRecords.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">Database Records</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">
                  {activeTables}
                </div>
                <div className="text-xs text-slate-400">Active Tables</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">
                  {categoryStats.length}
                </div>
                <div className="text-xs text-slate-400">
                  Categories with Listings
                </div>
              </div>
              {musicStats && (
                <>
                  <div>
                    <div className="text-lg font-bold text-pink-400">
                      {musicStats.totalArtists}
                    </div>
                    <div className="text-xs text-slate-400">Music Artists</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-violet-400">
                      {formatNumber(musicStats.totalStreams)}
                    </div>
                    <div className="text-xs text-slate-400">Total Streams</div>
                  </div>
                </>
              )}
              {topLocations.length > 0 && (
                <div>
                  <div className="text-lg font-bold text-amber-400">
                    {topLocations.length}+
                  </div>
                  <div className="text-xs text-slate-400">
                    City Zones Covered
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Sector Showcase */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-950" />

        <div className="relative max-w-7xl mx-auto px-4">
          <FloatingElement>
            <div className="text-center mb-16">
              <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
                <Globe className="h-3 w-3 mr-2" />
                Platform Sectors
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {PLATFORM_SECTORS.length} Integrated Sectors
                </span>
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                Each sector links to a dedicated analytics dashboard with
                real-time data, search, and business directory capabilities.
              </p>
            </div>
          </FloatingElement>

          {/* Sector Grid — each card links to a real route */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {PLATFORM_SECTORS.map((sector, index) => (
              <SectorCard key={sector.id} sector={sector} index={index} />
            ))}
          </div>

          {/* Sector Details Tabs */}
          <FloatingElement delay={0.4}>
            <Tabs
              defaultValue="commerce"
              value={activeSector}
              onValueChange={setActiveSector}
              className="mb-20"
            >
              <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 p-2 bg-slate-900/50 rounded-2xl backdrop-blur-sm border border-slate-700/50">
                {PLATFORM_SECTORS.map((sector) => (
                  <TabsTrigger
                    key={sector.id}
                    value={sector.id}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:border-0 data-[state=active]:text-white rounded-xl"
                    style={{
                      background:
                        sector.id === activeSector
                          ? `linear-gradient(135deg, var(--tw-gradient-stops))`
                          : undefined,
                    }}
                  >
                    <sector.icon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">
                      {sector.title.split(" ")[0]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSector}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {PLATFORM_SECTORS.filter((s) => s.id === activeSector).map(
                    (sector) => (
                      <TabsContent
                        value={sector.id}
                        key={sector.id}
                        className="mt-8"
                      >
                        <Card className="border-0 bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm">
                          <CardContent className="p-8">
                            <div className="flex items-start gap-6">
                              <div
                                className={`p-4 rounded-2xl ${sector.gradient} shadow-xl`}
                              >
                                <sector.icon className="h-8 w-8 text-white" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-2xl font-bold text-white mb-4">
                                  {sector.title}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div>
                                    <p className="text-slate-300 mb-6">
                                      {sector.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                      {[
                                        "Live Directory",
                                        "Search & Filter",
                                        "Analytics Dashboard",
                                        "Category Browse",
                                      ].map((tag, i) => (
                                        <Badge
                                          key={i}
                                          variant="secondary"
                                          className="bg-white/10 text-white/90"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                    <Link href={sector.route}>
                                      <Button
                                        variant="outline"
                                        className="border-slate-700 hover:bg-white/5"
                                      >
                                        Open {sector.title.split(" ")[0]}{" "}
                                        Dashboard
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                      </Button>
                                    </Link>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/30">
                                      <div className="text-2xl font-bold text-white mb-1">
                                        {loading
                                          ? "..."
                                          : totalBusinesses.toLocaleString()}
                                      </div>
                                      <div className="text-sm text-slate-400">
                                        Total Registered Businesses
                                      </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/30">
                                      <div className="text-2xl font-bold text-white mb-1">
                                        {loading
                                          ? "..."
                                          : `${avgRating.toFixed(1)}★`}
                                      </div>
                                      <div className="text-sm text-slate-400">
                                        Average Business Rating
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ),
                  )}
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </FloatingElement>
        </div>
      </section>

      {/* Top Categories from Database */}
      {categoryStats.length > 0 && (
        <section className="py-16 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900/50" />
          <div className="relative max-w-7xl mx-auto px-4">
            <FloatingElement>
              <div className="text-center mb-12">
                <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
                  <BarChart3 className="h-3 w-3 mr-2" />
                  Live from Database
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    Top Business Categories
                  </span>
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                  Real-time category breakdown from{" "}
                  {totalBusinesses.toLocaleString()} businesses across{" "}
                  {totalCategories.toLocaleString()} categories.
                </p>
              </div>
            </FloatingElement>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryStats.slice(0, 12).map(
                (
                  cat: {
                    name: string;
                    count: number;
                    growth: string;
                    status: string;
                  },
                  index: number,
                ) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-sm font-bold text-purple-300">
                        {index + 1}
                      </div>
                      <span className="text-white font-medium text-sm">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="bg-white/10 text-white/80"
                      >
                        {cat.count} {cat.count === 1 ? "listing" : "listings"}
                      </Badge>
                      <span className="text-xs text-emerald-400">
                        {cat.growth}
                      </span>
                    </div>
                  </motion.div>
                ),
              )}
            </div>

            {categoryStats.length > 12 && (
              <div className="text-center mt-8">
                <Link href="/businesses-directory">
                  <Button
                    variant="outline"
                    className="border-slate-700 hover:bg-white/5"
                  >
                    View All {totalCategories} Categories
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Top Locations */}
      {topLocations.length > 0 && (
        <section className="py-12 relative">
          <div className="relative max-w-7xl mx-auto px-4">
            <FloatingElement>
              <div className="text-center mb-10">
                <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
                  <MapPin className="h-3 w-3 mr-2" />
                  Geographic Coverage
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    Where Our Businesses Are
                  </span>
                </h2>
              </div>
            </FloatingElement>

            <div className="flex flex-wrap justify-center gap-4">
              {topLocations.map(
                (loc: { location: string; count: number }, i: number) => (
                  <motion.div
                    key={loc.location}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-all"
                  >
                    <MapPin className="h-5 w-5 text-amber-400" />
                    <div>
                      <div className="text-white font-semibold">
                        {loc.location}
                      </div>
                      <div className="text-xs text-slate-400">
                        {loc.count}{" "}
                        {loc.count === 1 ? "business" : "businesses"}
                      </div>
                    </div>
                  </motion.div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* Core Features */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950" />

        <div className="relative max-w-7xl mx-auto px-4">
          <FloatingElement>
            <div className="text-center mb-16">
              <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
                <Zap className="h-3 w-3 mr-2" />
                Platform Features
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  What Powers the Platform
                </span>
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                Built-in capabilities across every sector dashboard — search,
                analytics, real-time data, and more.
              </p>
            </div>
          </FloatingElement>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <FeatureHighlight
              icon={BarChart3}
              title="Real-time Analytics"
              description="Live business statistics, revenue tracking, and performance dashboards updated from PostgreSQL in real-time"
              color="text-blue-400"
            />
            <FeatureHighlight
              icon={Globe}
              title="Multi-Sector Search"
              description="Search across all business categories with filters for location, rating, and specialization"
              color="text-cyan-400"
              delay={0.1}
            />
            <FeatureHighlight
              icon={Shield}
              title="Session-based Auth"
              description="Secure authentication with Express sessions and role-based access for admin dashboards"
              color="text-green-400"
              delay={0.2}
            />
            <FeatureHighlight
              icon={Activity}
              title="WebSocket Notifications"
              description="Real-time updates via Socket.io for live notifications and data refresh across all connected clients"
              color="text-purple-400"
              delay={0.3}
            />
            <FeatureHighlight
              icon={Users}
              title="Business Directory"
              description="Comprehensive listing management with categories, reviews, ratings, hours, and contact information"
              color="text-pink-400"
              delay={0.4}
            />
            <FeatureHighlight
              icon={Lightbulb}
              title="Data-Driven Dashboards"
              description="Chart.js visualizations with revenue trends, category breakdowns, and performance metrics per sector"
              color="text-yellow-400"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Technology Stack — REAL */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />

        <div className="relative max-w-7xl mx-auto px-4">
          <FloatingElement>
            <div className="text-center mb-16">
              <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
                <Zap className="h-3 w-3 mr-2" />
                Technology Stack
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Built With
                </span>
              </h2>
            </div>
          </FloatingElement>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-16">
            {TECH_STACK.map((tech, i) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="p-4 rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 transition-all text-center group"
              >
                <div
                  className={`text-base font-semibold mb-1 ${tech.color} group-hover:scale-110 transition-transform`}
                >
                  {tech.name}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/10 to-blue-900/20" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <FloatingElement>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10 mb-8">
              <Star className="h-4 w-4 text-purple-300" />
              <span className="text-white/90">
                The Business Intelligence Platform for Côte d'Ivoire
              </span>
            </div>
          </FloatingElement>

          <FloatingElement delay={0.2}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Explore?
            </h2>
          </FloatingElement>

          <FloatingElement delay={0.4}>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Browse {totalBusinesses.toLocaleString()} businesses across{" "}
              {totalCategories.toLocaleString()} categories, or reach out to
              learn how your business can join the platform.
            </p>
          </FloatingElement>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link href="/businesses-directory">
              <Button className="px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all group">
                <Briefcase className="mr-2 h-5 w-5" />
                Browse Directory
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="px-8 py-6 text-lg border-slate-700 hover:bg-white/5 rounded-xl"
              >
                Contact Us
              </Button>
            </Link>
          </motion.div>

          {/* Trust Indicators — REAL facts */}
          <FloatingElement delay={0.8}>
            <div className="mt-12 pt-8 border-t border-slate-800">
              <div className="flex flex-wrap justify-center items-center gap-8 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>{totalBusinesses} Verified Businesses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span>{avgRating.toFixed(1)}★ Average Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <span>Abidjan, Côte d'Ivoire</span>
                </div>
              </div>
            </div>
          </FloatingElement>
        </div>
      </section>
      <ScrollToTop />
    </div>
  );
}

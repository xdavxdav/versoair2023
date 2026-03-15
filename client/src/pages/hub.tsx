/**
 * Central Hub — Platform Gateway
 * The main launchpad for the Verso Air Business Intelligence platform.
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  ShoppingBag,
  Coffee,
  HardHat,
  Car,
  DollarSign,
  Music,
  Stethoscope,
  Home as HomeIcon,
  Globe,
  Headphones,
  Bot,
  Rocket,
  Database,
  Activity,
  Star,
  ChevronRight,
  Sparkles,
  Shield,
  CalendarCheck,
  BookOpen,
  Palette,
  Search,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ScrollToTop from "@/components/ScrollToTop";
import { useAboutStats } from "@/hooks/use-about-stats";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  staggerItemScale,
  sectionReveal,
  cardHover,
  cardTap,
  defaultViewport,
} from "@/lib/animations";

/* ─── Sector quick-nav data ────────────────────────────────────── */
const SECTORS = [
  {
    title: "Commerce",
    icon: ShoppingBag,
    path: "/commerce",
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Hospitality",
    icon: Coffee,
    path: "/hotellerie",
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Construction",
    icon: HardHat,
    path: "/batiment",
    color: "from-amber-500 to-orange-500",
  },
  {
    title: "Automotive",
    icon: Car,
    path: "/automobile",
    color: "from-red-500 to-rose-500",
  },
  {
    title: "Finance",
    icon: DollarSign,
    path: "/finances",
    color: "from-emerald-500 to-teal-500",
  },
  {
    title: "Entertainment",
    icon: Music,
    path: "/divertissement",
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Health",
    icon: Stethoscope,
    path: "/sante",
    color: "from-rose-500 to-pink-500",
  },
  {
    title: "Housing",
    icon: HomeIcon,
    path: "/logement",
    color: "from-sky-500 to-blue-500",
  },
];

const SERVICES = [
  {
    title: "Business Directory",
    desc: "Browse & search all businesses",
    icon: Building2,
    path: "/businesses-directory",
    color: "from-slate-600 to-slate-800",
  },
  {
    title: "Reservations",
    desc: "Book services & appointments",
    icon: CalendarCheck,
    path: "/reservations",
    color: "from-indigo-500 to-blue-600",
  },
  {
    title: "Geo Admin",
    desc: "Location intelligence portal",
    icon: Globe,
    path: "/geo-admin",
    color: "from-teal-500 to-emerald-600",
  },
  {
    title: "SAV 24/7",
    desc: "Premium customer support",
    icon: Headphones,
    path: "/sav",
    color: "from-blue-600 to-purple-600",
  },
  {
    title: "VersoAI",
    desc: "AI-powered business assistant",
    icon: Bot,
    path: "/versoai",
    color: "from-cyan-500 to-blue-500",
  },
  {
    title: "All Services",
    desc: "Full services catalogue",
    icon: Rocket,
    path: "/services",
    color: "from-pink-500 to-rose-500",
  },
];

const FEATURES = [
  {
    title: "Real-time Analytics",
    desc: "Live dashboards with Chart.js",
    icon: BarChart3,
    color: "text-blue-500",
  },
  {
    title: "Multi-Sector Search",
    desc: "Filter by category, location, rating",
    icon: Search,
    color: "text-purple-500",
  },
  {
    title: "Secure Auth",
    desc: "Session-based with role controls",
    icon: Shield,
    color: "text-green-500",
  },
  {
    title: "Live Notifications",
    desc: "Socket.io real-time updates",
    icon: Zap,
    color: "text-amber-500",
  },
  {
    title: "Cultural Hub",
    desc: "Artisans, programs & communities",
    icon: Palette,
    color: "text-pink-500",
  },
  {
    title: "Digital Passport",
    desc: "Business verification system",
    icon: BookOpen,
    color: "text-cyan-500",
  },
];

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function HubPage() {
  const { overallStats, dbStats, loading } = useAboutStats();

  const totalBusinesses = overallStats?.total_businesses ?? 0;
  const totalCategories = overallStats?.total_categories ?? 0;
  const avgRating = overallStats?.avg_rating ?? 0;
  const totalRecords = dbStats?.totalRecords ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

        <div className="relative max-w-[95vw] mx-auto px-4 text-center">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <Badge className="mb-6 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all">
              <Sparkles className="h-3 w-3 mr-2" />
              Multi-Sector Intelligence Platform
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
              Verso Air
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Platform Hub
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Your central gateway to business directories, analytics dashboards,
            reservations, and AI-powered intelligence across every sector.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            <Link href="/businesses-directory">
              <Button className="px-8 py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all">
                <Building2 className="mr-2 h-5 w-5" />
                Browse Directory
              </Button>
            </Link>
            <Link href="/services">
              <Button
                variant="outline"
                className="px-8 py-6 text-lg border-slate-700 hover:bg-white/5 rounded-xl"
              >
                <Rocket className="mr-2 h-5 w-5" />
                All Services
              </Button>
            </Link>
          </motion.div>

          {/* Live Stats */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              {
                label: "Businesses",
                value: loading ? "..." : formatNum(totalBusinesses),
                icon: Building2,
              },
              {
                label: "Categories",
                value: loading ? "..." : formatNum(totalCategories),
                icon: Database,
              },
              {
                label: "Avg Rating",
                value: loading ? "..." : `${avgRating.toFixed(1)}★`,
                icon: Star,
              },
              {
                label: "DB Records",
                value: loading ? "..." : formatNum(totalRecords),
                icon: Activity,
              },
            ].map((stat) => (
              <motion.div key={stat.label} variants={staggerItem}>
                <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-colors group">
                  <stat.icon className="h-5 w-5 text-slate-400 mb-2 group-hover:text-purple-400 transition-colors" />
                  <div className="text-2xl font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-400">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Sector Quick-Nav ─────────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent" />
        <div className="relative max-w-[95vw] mx-auto px-4">
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-center mb-12"
          >
            <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
              <BarChart3 className="h-3 w-3 mr-2" />
              Industry Sectors
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Explore by Sector
              </span>
            </h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">
              Each sector links to a dedicated analytics dashboard with
              real-time data and search.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {SECTORS.map((sector) => {
              const Icon = sector.icon;
              return (
                <motion.div key={sector.path} variants={staggerItemScale}>
                  <Link href={sector.path}>
                    <motion.div
                      whileHover={cardHover}
                      whileTap={cardTap}
                      className="group relative cursor-pointer"
                    >
                      <Card className="h-full border-0 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-sm overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                        <CardContent className="p-6 text-center">
                          <div
                            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${sector.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                          >
                            <Icon className="h-7 w-7 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {sector.title}
                          </h3>
                          <div className="flex items-center justify-center gap-1 text-sm text-slate-400 group-hover:text-white/80 transition-colors">
                            <span>Explore</span>
                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Services & Tools ─────────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="relative max-w-[95vw] mx-auto px-4">
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-center mb-12"
          >
            <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
              <Rocket className="h-3 w-3 mr-2" />
              Platform Services
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Services & Tools
              </span>
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <motion.div key={svc.path} variants={staggerItemScale}>
                  <Link href={svc.path}>
                    <motion.div
                      whileHover={{ y: -5, scale: 1.02 }}
                      whileTap={cardTap}
                      className="group cursor-pointer"
                    >
                      <Card className="h-full border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/30 backdrop-blur-sm hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300">
                        <CardContent className="p-6 flex items-start gap-4">
                          <div
                            className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${svc.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white mb-1">
                              {svc.title}
                            </h3>
                            <p className="text-sm text-slate-400 mb-2">
                              {svc.desc}
                            </p>
                            <span className="inline-flex items-center text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                              Open{" "}
                              <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Platform Features ────────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        <div className="relative max-w-[95vw] mx-auto px-4">
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-center mb-12"
          >
            <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
              <Zap className="h-3 w-3 mr-2" />
              Capabilities
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Platform Highlights
              </span>
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <motion.div key={feat.title} variants={staggerItem}>
                  <div className="flex items-start gap-4 p-5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition-all duration-300 group">
                    <div className="p-2.5 rounded-lg bg-slate-800 group-hover:scale-110 transition-transform">
                      <Icon className={`h-5 w-5 ${feat.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">
                        {feat.title}
                      </h4>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Quick-access CTA ─────────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="p-10 rounded-3xl bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-white/10 backdrop-blur-sm"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Dive In?
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto">
              Navigate to any sector, browse the directory, or manage your
              business profile.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/businesses-directory">
                <Button className="px-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all group">
                  <Search className="mr-2 h-4 w-4" />
                  Search Directory
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/about">
                <Button
                  variant="outline"
                  className="px-8 py-5 border-slate-700 hover:bg-white/5 rounded-xl"
                >
                  About Platform
                </Button>
              </Link>
              <Link href="/sav">
                <Button
                  variant="outline"
                  className="px-8 py-5 border-slate-700 hover:bg-white/5 rounded-xl"
                >
                  <Headphones className="mr-2 h-4 w-4" />
                  Get Support
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}

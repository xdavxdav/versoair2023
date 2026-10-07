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
import { useLanguage } from "@/components/LanguageSwitcher";

// Platform sectors – these match the actual routes in your app
const PLATFORM_SECTORS = [
  {
    id: "commerce",
    title: "Commerce & Détail",
    icon: ShoppingBag,
    color: "from-purple-500 to-pink-500",
    gradient: "bg-gradient-to-r from-purple-500 to-pink-500",
    description:
      "Publicité commerciale, intelligence de marché & analytique du détail",
    route: "/commerce",
  },
  {
    id: "hotellerie",
    title: "Hôtellerie & Tourisme",
    icon: Hotel,
    color: "from-blue-500 to-cyan-500",
    gradient: "bg-gradient-to-r from-blue-500 to-cyan-500",
    description:
      "Annonces d'hébergement, locations de vacances & données hôtelières",
    route: "/hotellerie",
  },
  {
    id: "automobile",
    title: "Automobile",
    icon: Car,
    color: "from-orange-500 to-red-500",
    gradient: "bg-gradient-to-r from-orange-500 to-red-500",
    description:
      "Marché automobile, annuaire de concessionnaires & analytique auto",
    route: "/automobile",
  },
  {
    id: "batiment",
    title: "Construction & BTP",
    icon: Factory,
    color: "from-amber-500 to-yellow-500",
    gradient: "bg-gradient-to-r from-amber-500 to-yellow-500",
    description:
      "Entrepreneurs du bâtiment, fournisseurs de matériaux & projets de construction",
    route: "/batiment",
  },
  {
    id: "finances",
    title: "Finance & Banques",
    icon: Banknote,
    color: "from-emerald-500 to-teal-500",
    gradient: "bg-gradient-to-r from-emerald-500 to-teal-500",
    description:
      "Annuaire des services financiers & intelligence du secteur bancaire",
    route: "/finances",
  },
  {
    id: "sante",
    title: "Santé & Bien-être",
    icon: Stethoscope,
    color: "from-rose-500 to-pink-500",
    gradient: "bg-gradient-to-r from-rose-500 to-pink-500",
    description:
      "Hôpitaux, cliniques, médecins & annuaire des prestataires de santé",
    route: "/sante",
  },
  {
    id: "divertissement",
    title: "Divertissement",
    icon: Gamepad2,
    color: "from-violet-500 to-purple-500",
    gradient: "bg-gradient-to-r from-violet-500 to-purple-500",
    description:
      "Vie nocturne, cinémas, événements & activités de loisirs dans la ville",
    route: "/divertissement",
  },
  {
    id: "businesses-directory",
    title: "Annuaire d'Entreprises",
    icon: Building,
    color: "from-slate-600 to-slate-800",
    gradient: "bg-gradient-to-r from-slate-600 to-slate-800",
    description:
      "Annuaire complet d'entreprises & moteur de recherche multi-secteur",
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
  { name: "shadcn/ui", color: "text-slate-900" },
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
                <Icon className="h-7 w-7 text-slate-900" />
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-3">
              {sector.title}
            </h3>
            <p className="text-slate-300 text-sm mb-4">{sector.description}</p>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 group-hover:text-slate-900/80 transition-colors">
                Explorer le secteur →
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
        <h4 className="font-semibold text-slate-900 mb-2">{title}</h4>
        <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  </FloatingElement>
);

// Helper to format numbers nicely
// ─── Company identity — four questions ───────────────────────────────────────
// Facts below verified against the official Certificate & Articles of
// Incorporation (Ontario, Business Corporations Act), October 5, 2026.
// If a fact changes, update it here AND in the legal pages.
const COMPANY_COPY = {
  fr: {
    badge: "L'entreprise",
    heading: "Verso Air Inc. — l'entreprise derrière la plateforme",
    questions: [
      {
        icon: Building,
        q: "Qui est VERSO AIR INC. ?",
        a: "VERSO AIR INC. est une société par actions constituée en Ontario, Canada (numéro de société de l'Ontario 1001767617), en vigueur depuis le 5 octobre 2026. Cofondée par Boussou Elvis Jonathan et Joel Vanga, elle est établie à North York, Toronto. Ces informations sont vérifiables auprès du registre des entreprises de l'Ontario.",
      },
      {
        icon: Briefcase,
        q: "Que vend exactement l'entreprise ?",
        a: "VERSO AIR INC. prépare une plateforme numérique de visibilité pour les entreprises. L’annuaire, les espaces publicitaires et les outils d’analytique seront présentés au fur et à mesure de leur disponibilité et de la vérification des données.",
      },
      {
        icon: MapPin,
        q: "À qui s'adresse-t-elle ?",
        a: "Le lancement est axé sur Toronto. L’expansion vers d’autres secteurs et villes dépendra de la disponibilité des services et de données vérifiées.",
      },
      {
        icon: Shield,
        q: "Pourquoi lui faire confiance ?",
        a: "L’identité de VERSO AIR INC. peut être vérifiée auprès du registre des entreprises de l’Ontario. Les services, les annonces et les indicateurs seront présentés clairement selon leur état réel. VERSO AIR™ — protection de marque en préparation.",
      },
    ],
  },
  en: {
    badge: "The Company",
    heading: "Verso Air Inc. — the company behind the platform",
    questions: [
      {
        icon: Building,
        q: "Who is VERSO AIR INC.?",
        a: "VERSO AIR INC. is a corporation incorporated in Ontario, Canada (Ontario Corporation Number 1001767617), effective October 5, 2026. Co-founded by Boussou Elvis Jonathan and Joel Vanga, it is based in North York, Toronto. These facts are verifiable through the Ontario Business Registry.",
      },
      {
        icon: Briefcase,
        q: "What exactly does the company sell?",
        a: "VERSO AIR INC. is preparing a digital platform for business visibility. The directory, advertising placements, and analytics tools will be introduced as they become available and their data is verified.",
      },
      {
        icon: MapPin,
        q: "Who is it selling to?",
        a: "The initial launch focus is Toronto. Expansion to other sectors and cities will depend on service availability and verified data.",
      },
      {
        icon: Shield,
        q: "Why should someone trust it?",
        a: "The identity of VERSO AIR INC. can be verified through Ontario’s business registry. Services, listings, and metrics will be described according to their actual status. VERSO AIR™ — trademark protection in preparation.",
      },
    ],
  },
} as const;

function CompanySection() {
  const { currentLang } = useLanguage();
  const copy = currentLang === "en" ? COMPANY_COPY.en : COMPANY_COPY.fr;

  return (
    <section className="py-16 md:py-20 relative bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-14"
        >
          <Badge className="mb-4 px-4 py-2 bg-emerald-50 border-emerald-200 text-emerald-700">
            {copy.badge}
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900">
            {copy.heading}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {copy.questions.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 md:p-8 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-md">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {item.q}
                </h3>
                <p className="text-slate-600 leading-relaxed">{item.a}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const BRAND_ROADMAP = {
  fr: {
    badge: "Changements à venir",
    heading: "Notre architecture de marque — déploiement immédiat",
    intro:
      "Nous clarifions l'identité juridique de l'entreprise et la marque publique de sa plateforme.",
    items: [
      {
        title: "VERSO AIR INC.",
        text: "L'entité juridique et corporate. C'est l'identité de confiance utilisée pour les pages légales, le contact, la facturation et les communications officielles.",
      },
      {
        title: "VERSO AIR™",
        text: "La marque parapluie de la plateforme : annuaire, intelligence d'affaires, publicité, produits et services. Protection de marque en préparation.",
      },
      {
        title: "Projets futurs",
        text: "Les autres produits et services seront annoncés lorsqu'ils seront prêts.",
      },
    ],
  },
  en: {
    badge: "Upcoming changes",
    heading: "Our brand architecture — rolling out immediately",
    intro:
      "We are clarifying the company's legal identity and the public brand for its platform.",
    items: [
      {
        title: "VERSO AIR INC.",
        text: "The legal and corporate entity. This is the trust identity used across legal pages, contact, billing, and official communications.",
      },
      {
        title: "VERSO AIR™",
        text: "The umbrella platform brand for the directory, business intelligence, advertising, products, and services. Trademark protection is in preparation.",
      },
      {
        title: "Future projects",
        text: "Additional products and services will be announced when they are ready.",
      },
    ],
  },
} as const;

function BrandRoadmapSection() {
  const { currentLang } = useLanguage();
  const copy = currentLang === "en" ? BRAND_ROADMAP.en : BRAND_ROADMAP.fr;

  return (
    <section className="py-14 md:py-16 relative bg-slate-50 border-y border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge className="mb-4 px-4 py-2 bg-amber-50 border-amber-200 text-amber-700">
            {copy.badge}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {copy.heading}
          </h2>
          <p className="text-slate-600 max-w-3xl mx-auto">{copy.intro}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {copy.items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-3 notranslate">
                {item.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function About() {
  const [activeSector, setActiveSector] = useState(() => {
    const saved = sessionStorage.getItem("aboutActiveSector");
    return saved || "commerce";
  });
  const heroRef = useRef(null);

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

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#f3efe9] text-slate-900 overflow-hidden">
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
          className="relative z-10 max-w-[95vw] mx-auto px-4 py-20"
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
                Plateforme d'Intelligence Multi-Sectorielle
              </Badge>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                  Verso Air
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Écosystème d'Intelligence d'Affaires
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
              VERSO AIR INC. prépare le lancement à Toronto d’une plateforme
              numérique dédiée à la visibilité des entreprises et aux projets
              créatifs.
            </motion.p>

            {/* Keep a future-data container without publishing unverified records. */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mx-auto mb-12 max-w-2xl text-center"
            >
              <p className="text-slate-300">
                Directory listings, categories, ratings, and review totals will
                be published after the underlying records are verified.
              </p>
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
                  Parcourir les Entreprises
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  variant="outline"
                  className="px-8 py-6 text-lg border-slate-700 bg-white/10 text-slate-900 hover:bg-white/15 rounded-xl"
                >
                  Nous Contacter
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Company identity — the four questions */}
      <CompanySection />

      <BrandRoadmapSection />

      {/* Future-data container — figures remain unpublished pending verification. */}
      <section className="relative py-8 border-y border-slate-800/50 bg-slate-100/30 backdrop-blur-sm">
          <div className="max-w-[95vw] mx-auto px-4">
            <p className="text-center text-sm text-slate-400">
              Public directory and activity figures are being reviewed before
              publication.
            </p>
          </div>
      </section>

      {/* Sector Showcase */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-950" />

        <div className="relative max-w-[95vw] mx-auto px-4">
          <FloatingElement>
            <div className="text-center mb-16">
              <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
                <Globe className="h-3 w-3 mr-2" />
                Secteurs de la Plateforme
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {PLATFORM_SECTORS.length} secteurs de la plateforme
                </span>
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                Les services, annonces et indicateurs seront présentés lorsque
                leurs données auront été vérifiées et seront disponibles.
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
              <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 p-2 bg-slate-100/50 rounded-2xl backdrop-blur-sm border border-slate-700/50">
                {PLATFORM_SECTORS.map((sector) => (
                  <TabsTrigger
                    key={sector.id}
                    value={sector.id}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:border-0 data-[state=active]:text-slate-900 rounded-xl"
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
                                <sector.icon className="h-8 w-8 text-slate-900" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                  {sector.title}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div>
                                    <p className="text-slate-300 mb-6">
                                      {sector.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                      {[
                                        "Annuaire prévu",
                                        "Recherche & filtres prévus",
                                        "Outils en préparation",
                                        "Annonces vérifiées",
                                      ].map((tag, i) => (
                                        <Badge
                                          key={i}
                                          variant="secondary"
                                          className="bg-white/10 text-slate-900/90"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                    <Link href={sector.route}>
                                      <Button
                                        variant="outline"
                                        className="border-slate-700 bg-white/10 text-slate-900 hover:bg-white/15"
                                      >
                                        Ouvrir {sector.title.split(" ")[0]}{" "}
                                        Tableau de Bord
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                      </Button>
                                    </Link>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/30">
                                      <div className="text-2xl font-bold text-slate-900 mb-1">
                                        Bientôt
                                      </div>
                                      <div className="text-sm text-slate-400">
                                        Annonces après vérification
                                      </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/30">
                                      <div className="text-2xl font-bold text-slate-900 mb-1">
                                        Bientôt
                                      </div>
                                      <div className="text-sm text-slate-400">
                                        Avis après vérification
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

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            Annuaire et données publiques
          </h2>
          <p className="text-slate-600">
            Les annonces, notes et indicateurs géographiques seront affichés
            après vérification des données et des entreprises participantes.
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f3efe9] via-[#f8f5f1] to-[#efe7dd]" />

        <div className="relative max-w-[95vw] mx-auto px-4">
          <FloatingElement>
            <div className="text-center mb-16">
              <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
                <Zap className="h-3 w-3 mr-2" />
                Fonctionnalités prévues
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Ce Que VERSO AIR Prépare
                </span>
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                Les services et outils seront lancés progressivement, après
                validation de leur disponibilité et de leurs données.
              </p>
            </div>
          </FloatingElement>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <FeatureHighlight
              icon={BarChart3}
              title="Analytique d'entreprise"
              description="Outils d'analyse destinés aux entreprises, à déployer après validation."
              color="text-blue-400"
            />
            <FeatureHighlight
              icon={Globe}
              title="Recherche dans l'annuaire"
              description="Recherche et filtres prévus pour les annonces d'entreprises vérifiées."
              color="text-cyan-400"
              delay={0.1}
            />
            <FeatureHighlight
              icon={Shield}
              title="Accès aux comptes"
              description="Fonctionnalités de compte et d'accès en cours de préparation."
              color="text-green-400"
              delay={0.2}
            />
            <FeatureHighlight
              icon={Activity}
              title="Mises à jour"
              description="Les notifications et mises à jour seront annoncées lorsqu'elles seront disponibles."
              color="text-purple-400"
              delay={0.3}
            />
            <FeatureHighlight
              icon={Users}
              title="Annuaire d'entreprises"
              description="Un annuaire public est prévu; les annonces seront publiées après vérification."
              color="text-pink-400"
              delay={0.4}
            />
            <FeatureHighlight
              icon={Lightbulb}
              title="Tableaux de bord"
              description="Des outils de visualisation sont prévus; aucun indicateur de performance n'est publié pour le moment."
              color="text-yellow-400"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Technology Stack — REAL */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />

        <div className="relative max-w-[95vw] mx-auto px-4">
          <FloatingElement>
            <div className="text-center mb-16">
              <Badge className="mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm border-white/20">
                <Zap className="h-3 w-3 mr-2" />
                Pile Technologique
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Construit Avec
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
              <span className="text-slate-900/90">
                La Plateforme d'Intelligence d'Affaires pour Toronto et le Canada
              </span>
            </div>
          </FloatingElement>

          <FloatingElement delay={0.2}>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Prêt à Explorer ?
            </h2>
          </FloatingElement>

          <FloatingElement delay={0.4}>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              VERSO AIR INC. prépare ses services numériques pour Toronto.
              Contactez-nous pour en savoir plus sur les prochaines étapes.
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
                Parcourir l'Annuaire
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                className="px-8 py-6 text-lg border-slate-700 bg-white/10 text-slate-900 hover:bg-white/15 rounded-xl"
              >
                Nous Contacter
              </Button>
            </Link>
          </motion.div>

          {/* Company location remains public; unverified directory claims do not. */}
          <FloatingElement delay={0.8}>
            <div className="mt-12 pt-8 border-t border-slate-800">
              <div className="flex flex-wrap justify-center items-center gap-8 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <span>Toronto, Canada</span>
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

import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  defaultViewport,
} from "@/lib/animations";
import {
  Trees,
  Music,
  Palette,
  Users,
  ArrowRight,
  CheckCircle,
  Heart,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SeoHead } from "@/components/seo/SeoHead";
import { useLanguage } from "@/components/LanguageSwitcher";

type ProgramLang = "en" | "fr";

interface ProgramConcept {
  id: string;
  title: string;
  desc: string;
  icon: typeof Trees;
  details: string;
  statusTag: string;
  list: string[];
}

interface ProgramsPageCopy {
  seoTitle: string;
  seoDescription: string;
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  navHome: string;
  navArtisans: string;
  navCommunities: string;
  navPartners: string;
  navContact: string;
  sectionTitle: string;
  sectionSubtitle: string;
  aboutHeading: string;
  activitiesHeading: string;
  statusCardTitle: string;
  statusCardBody: string;
  inquireButton: string;
  inquireSubject: string;
  ctaTitle: string;
  ctaBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
  programs: ProgramConcept[];
}

const COPY: Record<ProgramLang, ProgramsPageCopy> = {
  en: {
    seoTitle: "Cultural Program Concepts | Verso Air",
    seoDescription:
      "Explore illustrative cultural program concepts in preparation with vHeartz and VERSO AIR INC. across music, arts, and community expression.",
    badge: "Illustrative Concepts · In Preparation",
    heroTitle: "Cultural Program Concepts",
    heroSubtitle:
      "vHeartz and VERSO AIR INC. are designing future cultural initiatives around music, visual arts, rural heritage, and community storytelling. All concepts below are illustrative — schedules, partners, and applications will be announced only once confirmed.",
    navHome: "Home",
    navArtisans: "Artisans",
    navCommunities: "Communities",
    navPartners: "Partners",
    navContact: "Contact",
    sectionTitle: "Exploratory Focus Areas",
    sectionSubtitle:
      "Select a concept track below to review the themes under consideration. No cohorts, grants, or participant applications are currently open.",
    aboutHeading: "Concept Overview",
    activitiesHeading: "Illustrative Format Ideas",
    statusCardTitle: "Current Status",
    statusCardBody:
      "Exploratory concept — not yet open for enrollment or funding. Scope, locations, and partner roles will be published before any launch.",
    inquireButton: "Discuss Collaboration",
    inquireSubject: "Cultural program collaboration inquiry",
    ctaTitle: "Interested in Co-Designing a Future Initiative?",
    ctaBody:
      "While no cultural program or public donation campaign is currently open, cultural institutions, educators, and community leaders are welcome to start an exploratory conversation with VERSO AIR INC.",
    ctaPrimary: "Contact VERSO AIR INC.",
    ctaSecondary: "View Partnership Approach",
    programs: [
      {
        id: "agriculture",
        title: "Agricultural & Heritage Arts",
        desc: "Connecting rural heritage and creative expression",
        icon: Trees,
        details:
          "An exploratory concept bringing together rural communities, craftspeople, and visual artists around sustainable materials, harvest traditions, and local cultural heritage.",
        statusTag: "Concept track · Not yet open",
        list: [
          "Rural craft documentation workshops",
          "Seasonal cultural showcase concepts",
          "Sustainable material and sculpture labs",
          "Intergenerational storytelling circles",
          "Exploratory artist-in-community exchanges",
        ],
      },
      {
        id: "music",
        title: "Music Learning & Live Sessions",
        desc: "Supporting emerging musical talent and production",
        icon: Music,
        details:
          "A prospective initiative focused on practical music mentorship, live acoustic sessions, and cross-border collaboration for independent artists.",
        statusTag: "Concept track · Not yet open",
        list: [
          "Peer songwriting and arrangement workshops",
          "Intimate live showcase concepts",
          "Digital release and rights literacy",
          "Cross-cultural creative sessions",
          "Future studio mentorship exploration",
        ],
      },
      {
        id: "urban",
        title: "Public & Visual Arts",
        desc: "Celebrating contemporary visual creators",
        icon: Palette,
        details:
          "An illustrative program model exploring how illustrators, muralists, and designers could collaborate with municipalities and local venues once partnerships and permits are established.",
        statusTag: "Concept track · Not yet open",
        list: [
          "Collaborative mural concepts (subject to municipal approval)",
          "Pop-up visual art exhibitions",
          "Portfolio development discussions",
          "Neighborhood cultural walk concepts",
          "Creator market showcases",
        ],
      },
      {
        id: "community",
        title: "Community Theater & Spoken Word",
        desc: "Sharing local stories on stage",
        icon: Users,
        details:
          "A future-facing concept dedicated to spoken word, multilingual theater, and oral history preservation across generations.",
        statusTag: "Concept track · Not yet open",
        list: [
          "Scriptwriting and spoken-word circles",
          "Original short play readings",
          "Youth stagecraft introductions",
          "Multilingual storytelling evenings",
          "Community venue collaborations",
        ],
      },
    ],
  },
  fr: {
    seoTitle: "Concepts de programmes culturels | Verso Air",
    seoDescription:
      "Découvrez les pistes de programmes culturels en préparation avec vHeartz et VERSO AIR INC. autour de la musique, des arts visuels et des communautés.",
    badge: "Concepts illustratifs · En préparation",
    heroTitle: "Concepts de programmes culturels",
    heroSubtitle:
      "vHeartz et VERSO AIR INC. préparent de futures pistes culturelles autour de la musique, des arts visuels, du patrimoine et de l’expression communautaire. Les modèles ci-dessous sont présentés à titre illustratif : aucun appel à candidatures ni calendrier n’est ouvert à ce stade.",
    navHome: "Accueil",
    navArtisans: "Artisans",
    navCommunities: "Communautés",
    navPartners: "Partenaires",
    navContact: "Contact",
    sectionTitle: "Axes exploratoires à l’étude",
    sectionSubtitle:
      "Sélectionnez un axe ci-dessous pour consulter les formats envisagés. Aucune cohorte, bourse ou inscription publique n’est ouverte actuellement.",
    aboutHeading: "Présentation du concept",
    activitiesHeading: "Exemples de formats envisagés",
    statusCardTitle: "Statut actuel",
    statusCardBody:
      "Concept exploratoire — aucune inscription ni collecte de fonds ouverte. La portée, les lieux et les partenaires seront annoncés uniquement après confirmation.",
    inquireButton: "Discuter d’une collaboration",
    inquireSubject: "Demande d'échange — concept de programme culturel",
    ctaTitle: "Envie d’échanger sur une future initiative ?",
    ctaBody:
      "Bien qu’aucun programme culturel ni campagne de dons ne soit ouvert actuellement, les institutions culturelles, formateurs et acteurs locaux peuvent contacter VERSO AIR INC. pour un premier échange exploratoire.",
    ctaPrimary: "Contacter VERSO AIR INC.",
    ctaSecondary: "Voir notre approche partenariale",
    programs: [
      {
        id: "agriculture",
        title: "Arts ruraux et patrimoine",
        desc: "Relier savoir-faire patrimoniaux et création contemporaine",
        icon: Trees,
        details:
          "Une piste exploratoire réunissant artisans, créateurs visuels et communautés rurales autour des matériaux durables, de la mémoire locale et de la transmission culturelle.",
        statusTag: "Piste exploratoire · Non ouverte",
        list: [
          "Ateliers de documentation des savoir-faire",
          "Rencontres culturelles saisonnières",
          "Exploration de matériaux durables et sculpture",
          "Cercles de récits intergénérationnels",
          "Échanges artistiques en milieu local",
        ],
      },
      {
        id: "music",
        title: "Musique et sessions live",
        desc: "Accompagner la création musicale indépendante",
        icon: Music,
        details:
          "Un concept en réflexion dédié au partage d’expérience musicale, aux sessions acoustiques et aux collaborations entre artistes émergents.",
        statusTag: "Piste exploratoire · Non ouverte",
        list: [
          "Ateliers d’écriture et d’arrangement entre pairs",
          "Concepts de vitrines musicales acoustiques",
          "Sensibilisation à la diffusion numérique et aux droits",
          "Rencontres créatives interculturelles",
          "Réflexion sur du mentorat en studio",
        ],
      },
      {
        id: "urban",
        title: "Arts visuels et espace public",
        desc: "Mettre en lumière les créateurs visuels",
        icon: Palette,
        details:
          "Un modèle illustratif explorant comment illustrateurs, muralistes et designers pourraient collaborer avec des lieux partenaires après accord et autorisations.",
        statusTag: "Piste exploratoire · Non ouverte",
        list: [
          "Projets muraux collaboratifs (sous réserve d’autorisations)",
          "Expositions éphémères d’arts visuels",
          "Échanges autour des portfolios créatifs",
          "Parcours culturels de quartier",
          "Vitrines d’artisans et créateurs",
        ],
      },
      {
        id: "community",
        title: "Théâtre et arts de la parole",
        desc: "Faire vivre les récits locaux sur scène",
        icon: Users,
        details:
          "Une piste tournée vers les arts de la parole, le théâtre multilingue et la valorisation des histoires locales à travers les générations.",
        statusTag: "Piste exploratoire · Non ouverte",
        list: [
          "Cercles d’écriture scénique et slam",
          "Lectures publiques de créations originales",
          "Initiation aux métiers de la scène",
          "Soirées de contes multilingues",
          "Collaborations avec des espaces culturels locaux",
        ],
      },
    ],
  },
};

export default function CulturalPrograms() {
  const { currentLang } = useLanguage();
  const lang: ProgramLang = currentLang === "en" ? "en" : "fr";
  const copy = COPY[lang];
  const [selectedId, setSelectedId] = useState<string>(copy.programs[0].id);

  const selectedProgram =
    copy.programs.find((program) => program.id === selectedId) ??
    copy.programs[0];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50">
      <SeoHead
        title={copy.seoTitle}
        description={copy.seoDescription}
        canonicalPath="/programs"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white py-12 md:py-16">
        <div className="max-w-[95vw] mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-amber-50 text-xs font-semibold uppercase tracking-wide mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{copy.badge}</span>
          </div>
          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            {copy.heroTitle}
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="text-base md:text-lg text-amber-50 max-w-3xl leading-relaxed"
          >
            {copy.heroSubtitle}
          </motion.p>
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
            <Link href="/">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                {copy.navHome}
              </span>
            </Link>
            <Link href="/artisans">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                {copy.navArtisans}
              </span>
            </Link>
            <Link href="/communities">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                {copy.navCommunities}
              </span>
            </Link>
            <Link href="/partners">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                {copy.navPartners}
              </span>
            </Link>
            <Link href="/contact">
              <span className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm transition-colors cursor-pointer whitespace-nowrap">
                {copy.navContact}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Programs Overview Grid */}
      <div className="max-w-[95vw] mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {copy.sectionTitle}
          </h2>
          <p className="text-gray-600 max-w-3xl">{copy.sectionSubtitle}</p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {copy.programs.map((program) => {
            const Icon = program.icon;
            const isSelected = selectedProgram.id === program.id;
            return (
              <button
                key={program.id}
                type="button"
                onClick={() => setSelectedId(program.id)}
                className={`text-left transition-all duration-300 ${
                  isSelected ? "sm:scale-[1.02]" : "hover:sm:scale-[1.01]"
                }`}
              >
                <Card
                  className={`cursor-pointer h-full border-2 transition-all ${
                    isSelected
                      ? "border-amber-500 shadow-xl bg-amber-50"
                      : "border-gray-200 shadow-md hover:shadow-lg hover:border-amber-300"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <Icon className="h-10 w-10 text-amber-600" />
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <CardTitle className="text-lg text-gray-900">
                      {program.title}
                    </CardTitle>
                    <CardDescription className="text-amber-700 font-medium text-sm">
                      {program.desc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full inline-block">
                      {program.statusTag}
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </motion.div>

        {/* Selected Program Details */}
        <div className="mb-12">
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 md:p-8 text-white">
              <div className="flex items-center gap-4">
                <selectedProgram.icon className="h-10 w-10 md:h-12 md:w-12 shrink-0" />
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">
                    {selectedProgram.title}
                  </h2>
                  <p className="text-amber-100 mt-1">{selectedProgram.desc}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 md:p-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {copy.aboutHeading}
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-8">
                    {selectedProgram.details}
                  </p>

                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {copy.activitiesHeading}
                  </h3>
                  <ul className="space-y-3">
                    {selectedProgram.list.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-3 text-gray-700"
                      >
                        <ArrowRight className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200 h-fit">
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-5 w-5 text-amber-700" />
                        <p className="font-bold text-gray-900">
                          {copy.statusCardTitle}
                        </p>
                      </div>
                      <p className="text-sm text-amber-900 leading-relaxed">
                        {copy.statusCardBody}
                      </p>
                    </div>

                    <Link
                      href={`/contact?subject=${encodeURIComponent(copy.inquireSubject)}`}
                    >
                      <button
                        type="button"
                        className="w-full group bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-900 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <span>{copy.inquireButton}</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exploratory Collaboration CTA */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl p-8 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-amber-100" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {copy.ctaTitle}
            </h2>
            <p className="text-amber-50 mb-6 leading-relaxed">{copy.ctaBody}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/contact?subject=${encodeURIComponent(copy.inquireSubject)}`}
              >
                <Button className="bg-white text-amber-700 hover:bg-amber-50 font-bold w-full sm:w-auto">
                  {copy.ctaPrimary}
                </Button>
              </Link>
              <Link href="/partners">
                <Button
                  variant="outline"
                  className="border-white bg-white/10 text-white hover:bg-white/20 font-bold w-full sm:w-auto"
                >
                  {copy.ctaSecondary}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

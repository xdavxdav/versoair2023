import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useCountry } from "@/contexts/CountryContext";
import {
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  MapPin,
  Megaphone,
  Monitor,
  Home as HomeIcon,
  Scale,
  Heart,
  Utensils,
  PawPrint,
  Wrench,
  Sofa,
  Shirt,
  Radio,
  Wheat,
  Users,
  HelpCircle,
  Sparkles,
  Briefcase,
  Building2,
  Plane,
  ArrowRight,
  Globe,
  Loader2,
  Database,
  Star,
  Phone,
  Tag,
  Building,
  CheckCircle,
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Filter,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence } from "framer-motion";
import { AuthHelper } from "@/components/AuthHelper";
import { useScrollLock } from "@/hooks/use-scroll-lock";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface Business {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  reviews: number;
  tags: string[];
  latitude?: number;
  longitude?: number;
  created_at?: string;
  revenue?: number;
  employees?: number;
  status?: "active" | "inactive" | "popular" | "verified" | "premium";
  specialization?: string[];
  years_experience?: number;
}

const categories = [
  {
    id: "communication",
    title: "Communication & Publicité",
    description:
      "Agences de communication, médias, imprimeries, événementiel et cadeaux d'entreprise.",
    icon: Megaphone,
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-50",
    links: [
      {
        label: "Agences de Communication",
        categoryId: "communication-agencies",
      },
      { label: "Imprimeries", categoryId: "publishing-houses" },
    ],
  },
  {
    id: "it-internet",
    title: "IT & Internet",
    description:
      "Services informatiques, développement web, hébergement cloud et solutions digitales.",
    icon: Monitor,
    color: "from-cyan-500 to-blue-500",
    bgColor: "bg-cyan-50",
    links: [
      { label: "Cybercafés", categoryId: "internet-cafes" },
      { label: "Hébergement Cloud", categoryId: "cloud-hosting-data-centers" },
    ],
  },
  {
    id: "immobilier",
    title: "Immobilier",
    description: "Agences immobilières, promoteurs et gestion de propriétés.",
    icon: HomeIcon,
    color: "from-emerald-500 to-green-500",
    bgColor: "bg-emerald-50",
    links: [
      { label: "Agences Immobilières", categoryId: "real-estate-agencies" },
      { label: "Promoteurs", categoryId: "real-estate-developers" },
    ],
  },
  {
    id: "conseil-juridique",
    title: "Conseil, Audit & Juridique",
    description:
      "Experts-comptables, avocats, notaires et services de conseil aux entreprises.",
    icon: Scale,
    color: "from-indigo-500 to-violet-500",
    bgColor: "bg-indigo-50",
    links: [
      { label: "Audit & Consulting", categoryId: "audit-consulting" },
      { label: "Experts-Comptables", categoryId: "chartered-accountants" },
    ],
  },
  {
    id: "sante",
    title: "Santé",
    description:
      "Médecins, cliniques, hôpitaux, pharmacies et laboratoires d'analyses.",
    icon: Heart,
    color: "from-rose-500 to-pink-500",
    bgColor: "bg-rose-50",
    links: [
      { label: "Médecins Spécialistes", categoryId: "doctors-specialists" },
      { label: "Hôpitaux & Cliniques", categoryId: "hospitals-clinics" },
    ],
  },
  {
    id: "alimentation",
    title: "Alimentation & Restauration",
    description:
      "Restaurants, traiteurs, commerces alimentaires et services culinaires.",
    icon: Utensils,
    color: "from-red-500 to-orange-500",
    bgColor: "bg-red-50",
    links: [
      { label: "Poissonneries", categoryId: "fishmongers" },
      { label: "Traiteurs", categoryId: "caterers" },
    ],
  },
  {
    id: "animaux",
    title: "Animaux",
    description: "Vétérinaires, animaleries, toilettage et soins pour animaux.",
    icon: PawPrint,
    color: "from-amber-500 to-yellow-500",
    bgColor: "bg-amber-50",
    links: [
      { label: "Pharmacies Vétérinaires", categoryId: "veterinary-pharmacies" },
      { label: "Vétérinaires", categoryId: "veterinarians" },
    ],
  },
  {
    id: "artisans",
    title: "Artisans",
    description: "Plombiers, électriciens, menuisiers et artisans qualifiés.",
    icon: Wrench,
    color: "from-slate-500 to-gray-500",
    bgColor: "bg-slate-50",
    links: [
      { label: "Plombiers", categoryId: "plumbers" },
      { label: "Vitriers", categoryId: "glass-glazing" },
    ],
  },
  {
    id: "maison-deco",
    title: "Maison & Décoration",
    description: "Mobilier, décoration intérieure, électroménager et design.",
    icon: Sofa,
    color: "from-teal-500 to-emerald-500",
    bgColor: "bg-teal-50",
    links: [
      { label: "Meubles", categoryId: "furniture-stores" },
      { label: "Galeries d'Art", categoryId: "art-galleries" },
    ],
  },
  {
    id: "mode-textile",
    title: "Mode & Textile",
    description: "Vêtements, tissus, accessoires et créateurs de mode.",
    icon: Shirt,
    color: "from-fuchsia-500 to-pink-500",
    bgColor: "bg-fuchsia-50",
    links: [
      { label: "Tissus & Textiles", categoryId: "fabrics-textiles" },
      { label: "Prêt-à-Porter", categoryId: "ready-to-wear-clothing" },
    ],
  },
  {
    id: "telecom",
    title: "Télécommunications",
    description:
      "Opérateurs téléphoniques, fournisseurs internet et équipements réseau.",
    icon: Radio,
    color: "from-blue-500 to-indigo-500",
    bgColor: "bg-blue-50",
    links: [
      { label: "Opérateurs Téléphoniques", categoryId: "telephone-operators" },
      { label: "Réseaux Telecom", categoryId: "voip-services" },
    ],
  },
  {
    id: "agroalimentaire",
    title: "Agroalimentaire",
    description:
      "Agriculture, élevage, transformation alimentaire et agribusiness.",
    icon: Wheat,
    color: "from-lime-500 to-green-500",
    bgColor: "bg-lime-50",
    links: [
      { label: "Abattoirs", categoryId: "slaughterhouses-meat-processing" },
      { label: "Produits Agrochimiques", categoryId: "agrochemicals" },
    ],
  },
  {
    id: "administrations",
    title: "Administrations",
    description:
      "Services publics, ambassades, consulats et institutions gouvernementales.",
    icon: Building2,
    color: "from-sky-500 to-blue-500",
    bgColor: "bg-sky-50",
    links: [
      { label: "Ambassades & Consulats", categoryId: "embassies-consulates" },
      { label: "Associations", categoryId: "associations-ngos" },
    ],
  },
  {
    id: "associations",
    title: "Associations Professionnelles",
    description: "Syndicats, fédérations et organisations professionnelles.",
    icon: Users,
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50",
    links: [
      { label: "Confédérations", categoryId: "confederations" },
      {
        label: "Ordres Professionnels",
        categoryId: "professional-regulatory-bodies",
      },
    ],
  },
  {
    id: "bien-etre",
    title: "Bien-être & Beauté",
    description: "Spas, salons de beauté, coiffeurs et soins esthétiques.",
    icon: Sparkles,
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
    links: [
      { label: "Salons de Beauté", categoryId: "beauty-aesthetic-salons" },
      { label: "Spas & Saunas", categoryId: "spas-saunas" },
    ],
  },
  {
    id: "emploi",
    title: "Emploi & RH",
    description:
      "Cabinets de recrutement, agences d'intérim et formation professionnelle.",
    icon: Briefcase,
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50",
    links: [
      { label: "Agences de Recrutement", categoryId: "recruitment-agencies" },
      { label: "Formation", categoryId: "training-centers" },
    ],
  },
  {
    id: "autres",
    title: "Autres Services",
    description: "Services divers et spécialisés.",
    icon: HelpCircle,
    color: "from-gray-500 to-slate-500",
    bgColor: "bg-gray-50",
    links: [
      {
        label: "Lieux de Culte",
        categoryId: "religious-institutions-places-of-worship",
      },
      { label: "Moteurs Marins", categoryId: "marine-engines" },
    ],
  },
];

// Map each UI sector card → explicit subcategory IDs from the database.
// This is needed because the DB parent categories (1-9) have mismatched
// subcategories scattered across them. We list ALL matching subcategory IDs
// regardless of which DB parent they sit under.
const CATEGORY_TO_IDS: Record<string, number[]> = {
  // Communication & Publicité — parent 1 has comm subs
  communication: [191, 192, 193, 194, 195, 196, 197, 198, 199],
  // IT & Internet — parent 6 (224-230) + parent 7 (226 Cloud, 408 Cybercafés)
  "it-internet": [224, 225, 226, 227, 228, 229, 230, 408],
  // Immobilier — parent 7 (231-235) + parent 3 scattered (409, 455)
  immobilier: [231, 232, 233, 234, 235, 409, 455],
  // Conseil, Audit & Juridique — parent 8 (236-240) + parent 4 (456)
  "conseil-juridique": [236, 237, 238, 239, 240, 456],
  // Santé — parent 10 (246-252) + parent 8 scattered (411, 413, 452)
  sante: [246, 247, 248, 249, 250, 251, 252, 411, 413, 452],
  // Alimentation & Restauration — parent 12 (258-263) + parent 1 scattered (412)
  alimentation: [258, 259, 260, 261, 262, 263, 412],
  // Animaux — parent 13 (264-268)
  animaux: [264, 265, 266, 267, 268],
  // Artisans — parent 14 (269-274) + parent 3 scattered (414)
  artisans: [269, 270, 271, 272, 273, 274, 414],
  // Maison & Décoration — parent 15 (275-279) + parent 1 scattered (415)
  "maison-deco": [275, 276, 277, 278, 279, 415],
  // Mode & Textile — parent 16 (280-284) + parent 1 scattered (416)
  "mode-textile": [280, 281, 282, 283, 284, 416],
  // Télécommunications — parent 17 (285-289) + parent 7 scattered (417)
  telecom: [285, 286, 287, 288, 289, 417],
  // Agroalimentaire — parent 18 (290-294) + parent 1 scattered (418)
  agroalimentaire: [290, 291, 292, 293, 294, 418],
  // Administrations — parent 11 (253-257) + parent 9 scattered (419)
  administrations: [253, 254, 255, 256, 257, 419],
  // Associations Professionnelles — parent 19 (295-298)
  associations: [295, 296, 297, 298],
  // Bien-être & Beauté — parent 20 (299-302) + parent 1 scattered (420)
  "bien-etre": [299, 300, 301, 302, 420],
  // Emploi & RH — parent 21 (303-306) + parent 9 scattered (421)
  emploi: [303, 304, 305, 306, 421],
  // Autres Services — parent 32 (351-353)
  autres: [351, 352, 353],
};

// Map subcategory slugs → numeric category ID(s) in the database.
// When a slug maps to multiple IDs (e.g. scattered duplicates across parents),
// we list them all so the query returns the union.
const SUBCATEGORY_SLUG_TO_ID: Record<string, number> = {
  "communication-agencies": 191,
  "publishing-houses": 197,
  "internet-cafes": 225,
  "cloud-hosting-data-centers": 226,
  "real-estate-agencies": 231,
  "real-estate-developers": 232,
  "audit-consulting": 236,
  "chartered-accountants": 237,
  "doctors-specialists": 247,
  "hospitals-clinics": 246,
  fishmongers: 261,
  caterers: 259,
  "veterinary-pharmacies": 265,
  veterinarians: 264,
  plumbers: 269,
  "glass-glazing": 272,
  "furniture-stores": 275,
  "art-galleries": 278,
  "fabrics-textiles": 282,
  "ready-to-wear-clothing": 280,
  "telephone-operators": 285,
  "voip-services": 287,
  "slaughterhouses-meat-processing": 291,
  agrochemicals: 292,
  "embassies-consulates": 255,
  "associations-ngos": 256,
  confederations: 295,
  "professional-regulatory-bodies": 296,
  "beauty-aesthetic-salons": 299,
  "spas-saunas": 300,
  "recruitment-agencies": 303,
  "training-centers": 316,
  "religious-institutions-places-of-worship": 351,
  "marine-engines": 352,
};

// Some subcategory slugs map to multiple DB IDs (scattered duplicates)
const SUBCATEGORY_SLUG_TO_IDS: Record<string, number[]> = {
  "real-estate-agencies": [231, 409, 455],
  "doctors-specialists": [247, 411, 452],
  plumbers: [269, 414],
};

async function searchBusinessesByCategory(params: {
  category?: string;
  subcategorySlug?: string;
  query?: string;
  location?: string;
  countryCode?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Business[]; total: number; success: boolean }> {
  try {
    const page = params.page || 1;
    const limit = params.limit || 12;

    const queryParams = new URLSearchParams();
    queryParams.append("page", String(page));
    queryParams.append("limit", String(limit));
    if (params.query) queryParams.append("search", params.query);
    if (params.location) queryParams.append("location", params.location);
    if (params.countryCode)
      queryParams.append("countryCode", params.countryCode);

    // 1) Specific subcategory slug → exact categoryId(s)
    if (
      params.subcategorySlug &&
      SUBCATEGORY_SLUG_TO_ID[params.subcategorySlug]
    ) {
      // Check if this slug maps to multiple scattered IDs
      if (SUBCATEGORY_SLUG_TO_IDS[params.subcategorySlug]) {
        queryParams.append(
          "categoryIds",
          SUBCATEGORY_SLUG_TO_IDS[params.subcategorySlug].join(","),
        );
      } else {
        queryParams.append(
          "categoryId",
          String(SUBCATEGORY_SLUG_TO_ID[params.subcategorySlug]),
        );
      }
    }
    // 2) Card category → explicit subcategory ID list
    else if (params.category && CATEGORY_TO_IDS[params.category]) {
      queryParams.append(
        "categoryIds",
        CATEGORY_TO_IDS[params.category].join(","),
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/businesses?${queryParams.toString()}`,
    );

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const rows = Array.isArray(data.data) ? data.data : [];

    // Map API field names to the Business interface expected by the UI
    const mapped: Business[] = rows.map((row: any) => ({
      id: row.id,
      title: row.name || row.title || "Untitled",
      description: row.description || "",
      category: row.category_name || row.category || "",
      location:
        [row.location, row.city_name].filter(Boolean).join(", ") ||
        row.location ||
        "",
      address: row.address || "",
      phone: row.phone || "",
      email: row.email || "",
      rating: parseFloat(row.rating) || 0,
      reviews: row.reviews || 0,
      tags: Array.isArray(row.tags) ? row.tags : [],
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      created_at: row.created_at,
      revenue: row.revenue,
      employees: row.employees,
      status: row.is_active
        ? row.is_advertiser
          ? "premium"
          : "active"
        : "inactive",
      specialization: row.specialization,
      years_experience: row.years_experience,
    }));

    return {
      data: mapped,
      total: parseInt(data.pagination?.total) || mapped.length,
      success: true,
    };
  } catch (error) {
    console.error("Search failed:", error);
    return { data: [], total: 0, success: false };
  }
}

const CategoryCard = ({
  category,
  index,
  onCategoryClick,
  onSubcategoryClick,
}: {
  category: any;
  index: number;
  onCategoryClick: (category: any) => void;
  onSubcategoryClick: (
    subcategory: { label: string; categoryId: string },
    parentCategory: any,
  ) => void;
}) => {
  const Icon = category.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      onClick={() => onCategoryClick(category)}
      className="group cursor-pointer"
    >
      <div className="relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden h-full">
        {/* Gradient accent on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
        />

        {/* Real icon with gradient */}
        <div
          className={`w-14 h-14 rounded-xl ${category.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
        >
          <div
            className={`w-7 h-7 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center`}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-sky-600 transition-colors">
            {category.title}
          </h3>

          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {category.description}
          </p>

          <div className="space-y-1.5">
            {category.links.map((link: any, i: number) => (
              <div
                key={i}
                className="flex items-center text-sm text-sky-600 hover:text-sky-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubcategoryClick(link, category);
                }}
              >
                <ArrowRight className="w-3 h-3 mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="hover:underline">{link.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function BusinessesDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const { selectedCountry } = useCountry();
  const [selectedCategory, setSelectedCategory] = useState<
    (typeof categories)[0] | null
  >(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<{
    label: string;
    categoryId: string;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(
    null,
  );
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  useScrollLock(showBusinessDetails);

  // Test database connection and ensure auth
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        setDatabaseConnected(response.ok);
      } catch (error) {
        console.error("Database connection test failed:", error);
        setDatabaseConnected(false);
      }
    };
    checkConnection();
  }, []);

  const handleCategoryClick = useCallback(
    async (category: (typeof categories)[0]) => {
      setSelectedCategory(category);
      setSelectedSubcategory(null);
      setSearchQuery("");
      setLocationQuery("");
      setCurrentPage(1);
      setIsSearching(true);
      setHasSearched(true);

      const result = await searchBusinessesByCategory({
        category: category.id,
        countryCode: selectedCountry || undefined,
        limit: 12,
        page: 1,
      });

      if (result.success) {
        setSearchResults(result.data);
        setTotalResults(result.total);
      }
      setIsSearching(false);
    },
    [selectedCountry],
  );

  const handleSubcategoryClick = useCallback(
    async (
      subcategory: { label: string; categoryId: string },
      parentCategory: any,
    ) => {
      setSelectedCategory(parentCategory);
      setSelectedSubcategory(subcategory);
      setSearchQuery("");
      setLocationQuery("");
      setCurrentPage(1);
      setIsSearching(true);
      setHasSearched(true);

      const result = await searchBusinessesByCategory({
        subcategorySlug: subcategory.categoryId,
        category: parentCategory.id,
        countryCode: selectedCountry || undefined,
        limit: 12,
        page: 1,
      });

      if (result.success) {
        setSearchResults(result.data);
        setTotalResults(result.total);
      }
      setIsSearching(false);
    },
    [selectedCountry],
  );

  const handleSearch = useCallback(
    async (page: number = 1) => {
      setIsSearching(true);
      setCurrentPage(page);

      const result = await searchBusinessesByCategory({
        subcategorySlug: selectedSubcategory?.categoryId,
        category: selectedCategory?.id,
        query: searchQuery,
        location: locationQuery,
        countryCode: selectedCountry || undefined,
        page,
        limit: 12,
      });

      if (result.success) {
        setSearchResults(result.data);
        setTotalResults(result.total);
        setHasSearched(true);
      }
      setIsSearching(false);
    },
    [
      selectedCategory,
      selectedSubcategory,
      searchQuery,
      locationQuery,
      selectedCountry,
    ],
  );

  const clearSearch = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearchQuery("");
    setLocationQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-[#0A1628] text-white">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight">
                  Verso Air
                </span>
                <span className="hidden sm:inline text-sky-400 ml-2 text-sm font-medium">
                  Business Directory
                </span>
              </div>
            </div>

            {databaseConnected !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  databaseConnected
                    ? "bg-green-900/30 text-green-300"
                    : "bg-red-900/30 text-red-300"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${databaseConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                />
                {databaseConnected ? "✅ Connected" : "❌ Offline"}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-[#0A1628] pt-16 pb-16 sm:pb-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-2 h-2 bg-sky-400 rounded-full animate-pulse" />
          <div className="absolute top-60 left-1/3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-300" />
          <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-700" />
        </div>

        <div className="relative max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Globe className="w-4 h-4 text-sky-400" />
              <span className="text-sm text-gray-300">
                Your gateway to African businesses
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
              African Business
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 mt-2">
                Directory
              </span>
            </h1>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Discover professionals and businesses across the African continent
              by category
            </p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Business name, service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-12 h-14 border-0 bg-gray-50 rounded-xl text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="flex-1 relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Country, city..."
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-12 h-14 border-0 bg-gray-50 rounded-xl text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <Button
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="h-14 px-8 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section or Search Results */}
      {!hasSearched ? (
        <section className="relative -mt-16 pb-20">
          <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-12"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Browse by Category
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Click on a category to explore businesses in that sector
                  </p>
                </div>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-6 py-6 rounded-xl shadow-lg shadow-amber-500/25 whitespace-nowrap">
                  List Your Business
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>

            {/* Categories Grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={defaultViewport}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {categories.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={index}
                  onCategoryClick={handleCategoryClick}
                  onSubcategoryClick={handleSubcategoryClick}
                />
              ))}
            </motion.div>
          </div>
        </section>
      ) : (
        // Search Results Section
        <section className="relative -mt-16 pb-20">
          <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Results Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-12"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {selectedCategory && (
                      <>
                        {React.createElement(selectedCategory.icon, {
                          className: "w-6 h-6 text-sky-600",
                        })}
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {selectedSubcategory
                              ? selectedSubcategory.label
                              : selectedCategory.title}
                          </h2>
                          {selectedSubcategory && (
                            <p className="text-sm text-gray-500">
                              {selectedCategory.title}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-gray-500 mt-1">
                    Showing {searchResults.length} of{" "}
                    {totalResults.toLocaleString()} businesses
                  </p>
                </div>
                <Button
                  onClick={clearSearch}
                  variant="outline"
                  className="border-gray-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Search
                </Button>
              </div>
            </motion.div>

            {/* Loading State */}
            {isSearching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-200 rounded-xl h-64 animate-pulse"
                  />
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <AnimatePresence>
                    {searchResults.map((business, index) => (
                      <motion.div
                        key={business.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => {
                          setSelectedBusiness(business);
                          setShowBusinessDetails(true);
                        }}
                        className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 overflow-hidden cursor-pointer group"
                      >
                        <div
                          className={`h-2 bg-gradient-to-r from-sky-500 to-blue-600`}
                        />
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-sky-600 transition-colors mb-2 line-clamp-1">
                                {business.title}
                              </h3>
                              <div className="flex items-center gap-2 text-gray-600 mb-2">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">
                                  {business.location}
                                </span>
                              </div>
                              {(business as any).is_verified && (
                                <Badge className="bg-blue-900/30 text-blue-300 border-blue-500/30 text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            {business.rating && (
                              <div className="flex items-center gap-1 bg-amber-50 px-3 py-2 rounded-lg">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="font-bold text-amber-900">
                                  {business.rating}
                                </span>
                              </div>
                            )}
                          </div>

                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {business.description}
                          </p>

                          <div className="space-y-2 mb-4 text-sm">
                            {business.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{business.phone}</span>
                              </div>
                            )}
                            {business.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <span className="text-xs">✉</span>
                                <span className="text-xs truncate">
                                  {business.email}
                                </span>
                              </div>
                            )}
                          </div>

                          {business.tags && business.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {business.tags.slice(0, 3).map((tag, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBusiness(business);
                              setShowBusinessDetails(true);
                            }}
                            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Contact
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalResults > 12 && (
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleSearch(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {Math.ceil(totalResults / 12)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => handleSearch(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalResults / 12)}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No Businesses Found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try a different search or browse other categories
                </p>
                <Button
                  onClick={clearSearch}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                >
                  Browse Categories
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Business Details Modal */}
      <AnimatePresence>
        {showBusinessDetails && selectedBusiness && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBusinessDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedBusiness.title}
                </h2>
                <button
                  onClick={() => setShowBusinessDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="w-5 h-5 text-sky-600" />
                      <span className="text-gray-700 font-medium">
                        {selectedBusiness.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-800">
                        {selectedBusiness.category}
                      </Badge>
                      {selectedBusiness.status && (
                        <Badge className="bg-green-100 text-green-800">
                          {selectedBusiness.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {selectedBusiness.rating && (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 bg-amber-50 px-4 py-2 rounded-lg">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-2xl font-bold text-amber-900">
                          {selectedBusiness.rating}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 mt-2">
                        {selectedBusiness.reviews} reviews
                      </span>
                    </div>
                  )}
                </div>

                {selectedBusiness.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Description
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedBusiness.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedBusiness.phone && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-600 mb-1">Phone</div>
                        <div className="text-lg font-semibold text-gray-900 break-all">
                          {selectedBusiness.phone}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedBusiness.email && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-600 mb-1">Email</div>
                        <div className="text-lg font-semibold text-gray-900 break-all">
                          {selectedBusiness.email}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedBusiness.revenue && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-600 mb-1">
                          Revenue
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          €{selectedBusiness.revenue.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedBusiness.employees && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-600 mb-1">
                          Employees
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {selectedBusiness.employees}+
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {selectedBusiness.address && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Address
                    </h3>
                    <p className="text-gray-700">{selectedBusiness.address}</p>
                  </div>
                )}

                {selectedBusiness.tags && selectedBusiness.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Services & Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedBusiness.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <Button className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white">
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Business
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowBusinessDetails(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#0A1628] text-white py-12 border-t border-gray-800">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Verso Air</span>
            </div>

            <p className="text-gray-400 text-sm text-center">
              © 2024 Verso Air Business Directory. Your gateway to African
              businesses.
            </p>

            <div className="flex gap-4 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="/terms" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="/contact" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Helper */}
      <AuthHelper />
    </div>
  );
}

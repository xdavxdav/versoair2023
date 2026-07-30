"use client";

import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import AnimatedHeading from "@/components/AnimatedHeading";
import GoldenAnimatedHeading from "@/components/GoldenAnimatedHeading";
import AnimatedKeyboardText from "@/components/AnimatedKeyboardText";
import { AnimatedButton } from "@/components/AnimatedButton";
import { useCountry } from "@/contexts/CountryContext";
import { useLanguage } from "@/components/LanguageSwitcher";
import { getCountryMeta } from "@/utils/countryMeta";
/* webhint-disable hint-no-inline-styles */
import {
  Search,
  User,
  CreditCard,
  Truck,
  Package,
  Undo,
  Shield,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  SlidersHorizontal,
  XCircle,
  Sparkles,
  Music,
  Palette,
  Trees,
  Users,
  MapPin,
  Loader2,
  Navigation,
  Briefcase,
  Calendar,
  Globe,
  Handshake,
  Building2,
  Target,
  ArrowRight,
  Heart,
  Cookie,
  Database,
  Menu,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Globe as GlobeIcon,
  Eye,
  ExternalLink,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  BarChart3,
  Play,
  Building,
  CheckCircle,
  Tag,
  Headphones,
  Disc3,
  Lock,
} from "lucide-react";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollToTop from "@/components/ScrollToTop";
import { useMusicArtists } from "@/hooks/use-music";
import { searchBusinesses, Business } from "@/lib/business-data";
import { useSubscription } from "@/hooks/use-subscription";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { CulturalProgramsModal } from "@/components/home/CulturalProgramsModal";
import { CookieConsentBanner } from "@/components/home/CookieConsentBanner";
import { ArtistCarouselByCountry } from "@/components/home/ArtistCarouselByCountry";
import { isBaseLang } from "@/utils/country-language";

gsap.registerPlugin(ScrollTrigger);

// Luxurious gold gradient text styles
const goldTextStyles = `
  @keyframes shine {
    0% {
      background-position: -50rem 0;
    }
    25% {
      background-position: -50rem 0;
    }
    100% {
      background-position: 30rem 0;
    }
  }

  @keyframes flash {
    0% {
      opacity: 1;
    }
    10% {
      opacity: 0;
    }
    30% {
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    90% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  .gold-text {
    font-family: 'Alegreya', 'Georgia', serif;
    font-style: italic;
    font-size: 3.5rem;
    word-spacing: 0.2em;
    display: inline-block;
    padding: 0;
    line-height: 1.1;
    white-space: normal;
    text-align: center;
    color: transparent;
    background-color: #E8A95B;
    background-image: 
      radial-gradient(ellipse farthest-corner at right bottom, white 0%, #F0BB7A 20%, #E8A95B 60%, transparent 80%),
      radial-gradient(ellipse farthest-corner at left top, white 0%, #F0BB7A 50%, #DE9945 75%, #E8A95B 100%);
    background-size: 100% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    margin: 0;
    position: relative;
  }

  .gold-text::before {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    color: #E8A95B;
    z-index: -1;
    text-shadow:
      0 -1px 0 rgba(240, 187, 122, 0.75),
      0 1px 0 rgba(222, 153, 69, 0.75),
      0 2px 0 rgba(222, 153, 69, 0.70),
      0 3px 0 rgba(222, 153, 69, 0.65),
      0 4px 0 rgba(222, 153, 69, 0.55),
      0 4px 2px rgba(222, 153, 69, 0.55),
      0 0.075em 0.1em rgba(26, 35, 39, 0.3),
      0 0.15em 0.3em rgba(222, 153, 69, 0.2);
  }

  .gold-text__shine {
    display: inline-block;
    position: relative;
    z-index: 1;
  }

  .gold-text__shine::after {
    content: attr(data-text);
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 5;
    background-image: 
      linear-gradient(100deg,
        transparent 0%,
        transparent 6rem,
        white 11rem,
        transparent 11.15rem,
        transparent 15rem,
        rgba(255,255,255,0.3) 20rem,
        transparent 25rem,
        transparent 27rem,
        rgba(255,255,255,0.6) 32rem,
        white 33rem,
        rgba(255,255,255,0.3) 33.15rem,
        transparent 38rem,
        transparent 40rem,
        rgba(255,255,255,0.3) 45rem,
        transparent 50rem,
        transparent 100%);
    background-clip: text;
    background-size: 60rem 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    animation: shine 4s infinite linear;
  }

  .gold-text__shine::before {
    content: attr(data-text);
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    color: transparent;
    background-image: 
      linear-gradient(to bottom,
        rgba(255,255,255,0.5) 0%,
        transparent 35%,
        transparent 75%,
        #DE9945 100%);
    background-clip: text;
    -webkit-background-clip: text;
    animation: flash 4s infinite linear;
  }

  @media (min-width: 769px) {
    .gold-text {
      white-space: nowrap;
    }
  }

  @media (max-width: 768px) {
    .gold-text {
      font-size: 2rem;
    }
  }

  /* ── Mobile: kill pseudo-element layers that cause duplication ── */
  @media (max-width: 640px) {
    .gold-text {
      font-size: 1.35rem;
      /* Make the gold color visible directly instead of pseudo-layer trick */
      color: #E8A95B;
      -webkit-text-fill-color: #E8A95B;
    }
    .gold-text::before {
      content: none;
    }
    .gold-text__shine::after,
    .gold-text__shine::before {
      content: none;
    }
  }

  @media (max-width: 380px) {
    .gold-text {
      font-size: 1.15rem;
    }
  }
`;

// Define types for our filters and businesses
interface FilterOption {
  value: string;
  label: string;
}

interface ActiveFilter {
  id: string;
  label: string;
  value: string;
}

interface SearchParams {
  query: string;
  category?: string;
  location?: string;
  range?: string;
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
  countryCode?: string;
}

// Calculate distance between coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// API Configuration
const API_BASE_URL = "";

// API Search Function - DATABASE ONLY (uses public endpoint)
async function searchBusinessesAPI(params: SearchParams): Promise<{
  data: Business[];
  total: number;
  totalInDatabase: number;
  success: boolean;
  error?: string;
}> {
  try {
    const page = params.page || 1;
    const limit = params.limit || 50;

    // Build query params — search and location are separate server-side filters
    const queryParams = new URLSearchParams();
    queryParams.append("page", String(page));
    queryParams.append("limit", String(limit));
    if (params.query) queryParams.append("search", params.query);
    if (params.location) queryParams.append("location", params.location);
    if (params.category) queryParams.append("categoryId", params.category);
    if (params.countryCode)
      queryParams.append("countryCode", params.countryCode);

    const response = await fetch(
      `${API_BASE_URL}/api/businesses?${queryParams.toString()}`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const responseData = await response.json();
    const rows = Array.isArray(responseData.data) ? responseData.data : [];

    const result = {
      success: true,
      data: rows.map((business: any) => ({
        id: business.id?.toString() || "",
        title: business.name || business.title || "",
        description: business.description || "",
        category: business.category_name || business.category || "",
        location: business.location || business.city_name || "",
        address: business.address || "",
        phone: business.phone || "",
        email: business.email || "",
        rating: parseFloat(business.rating) || 0,
        reviews: parseInt(business.reviews) || 0,
        tags:
          typeof business.tags === "string"
            ? JSON.parse(business.tags || "[]")
            : business.tags || [],
        latitude: parseFloat(business.latitude) || 0,
        longitude: parseFloat(business.longitude) || 0,
        distance: business.distance,
        created_at: business.created_at || new Date().toISOString(),
      })),
      total: parseInt(responseData.pagination?.total) || rows.length,
      totalInDatabase: parseInt(responseData.pagination?.total) || rows.length,
    };

    return result;
  } catch (error: any) {
    console.error("API call failed:", error);
    return {
      data: [],
      total: 0,
      totalInDatabase: 0,
      success: false,
      error: error.message || "Failed to fetch data from server",
    };
  }
}

// Get all businesses from database
async function getAllBusinesses(): Promise<{
  data: Business[];
  total: number;
  success: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/businesses`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      const businesses = result.data.map((business: any) => ({
        id: business.id?.toString() || "",
        title: business.title || business.name || "",
        description: business.description || "",
        category: business.category || "",
        location: business.location || "",
        address: business.address || "",
        phone: business.phone || "",
        email: business.email || "",
        rating: business.rating || 0,
        reviews: business.reviews || 0,
        tags:
          typeof business.tags === "string"
            ? (() => {
                try {
                  return JSON.parse(business.tags || "[]");
                } catch {
                  return [];
                }
              })()
            : business.tags || [],
        latitude: business.latitude || 0,
        longitude: business.longitude || 0,
        distance: business.distance,
        created_at: business.created_at || new Date().toISOString(),
      }));

      return {
        data: businesses,
        total: result.total || businesses.length,
        success: true,
      };
    }

    return {
      data: [],
      total: 0,
      success: false,
    };
  } catch (error: any) {
    console.error("Failed to get all businesses:", error);
    return {
      data: [],
      total: 0,
      success: false,
    };
  }
}

// Test database connection
async function testDatabaseConnection(): Promise<{
  success: boolean;
  database?: {
    connected: boolean;
    database?: string;
    time?: string;
    error?: string;
  };
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return {
      success: data.database?.connected === true,
      database: data.database,
    };
  } catch (error: any) {
    console.error("Database connection test failed:", error);
    return {
      success: false,
      database: { connected: false, error: error.message },
    };
  }
}

// Testimonials data

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Magnetic Input Component
type MagneticInputProps = {
  children: React.ReactNode;
  className?: string;
};

const MagneticInput = ({ children, className }: MagneticInputProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const isTouchDevice =
    typeof window !== "undefined" && "ontouchstart" in window;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current || isTouchDevice) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2),
      );
      if (dist < 200) {
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const distance = (1 - dist / 200) * 12;
        setTransform({
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
        });
      }
    },
    [isTouchDevice],
  );

  const handleMouseLeave = () => setTransform({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      animate={{ x: transform.x, y: transform.y }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// NGO Impact Footer
const ResponsiveFooter = ({
  countryMeta,
}: {
  countryMeta: ReturnType<typeof getCountryMeta>;
}) => {
  const { isAuthenticated } = useSubscription();

  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30rem] h-32 bg-emerald-500/[0.03] blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Impact Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
          <div className="text-center">
            <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              150+
            </p>
            <p className="text-gray-500 text-[11px] uppercase tracking-[0.15em] mt-2">
              Communautés touchées
            </p>
          </div>
          <div className="text-center">
            <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              2,400+
            </p>
            <p className="text-gray-500 text-[11px] uppercase tracking-[0.15em] mt-2">
              Artisans soutenus
            </p>
          </div>
          <div className="text-center">
            <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              35
            </p>
            <p className="text-gray-500 text-[11px] uppercase tracking-[0.15em] mt-2">
              Pays actifs
            </p>
          </div>
          <div className="text-center">
            <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              80+
            </p>
            <p className="text-gray-500 text-[11px] uppercase tracking-[0.15em] mt-2">
              Programmes en cours
            </p>
          </div>
        </div>

        <div className="h-px bg-slate-800/60 mb-12" />

        {/* Main Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-xs tracking-tight">
                  AH
                </span>
              </div>
              <span className="font-bold text-lg tracking-tight notranslate">
                ArtiHuman Foundation
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Soutenir les artisans et élever les communautés grâce à
              l'innovation humanitaire à travers {countryMeta.nameFr}.
            </p>
            <div className="flex gap-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-slate-800 flex items-center justify-center text-gray-600 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
              >
                <Facebook size={14} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-slate-800 flex items-center justify-center text-gray-600 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
              >
                <Twitter size={14} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-slate-800 flex items-center justify-center text-gray-600 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
              >
                <Instagram size={14} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-slate-800 flex items-center justify-center text-gray-600 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
              >
                <Linkedin size={14} />
              </a>
            </div>
          </div>

          {/* Programs */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-5">
              Programmes
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/programs"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Programmes culturels
                </Link>
              </li>
              <li>
                <Link
                  to="/artisan"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Formation artisanale
                </Link>
              </li>
              <li>
                <Link
                  to="/programs"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Aide humanitaire
                </Link>
              </li>
              <li>
                <Link
                  to="/commerce"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors notranslate"
                >
                  Marché artisanal
                </Link>
              </li>
              <li>
                <Link
                  to="/programs"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Impact communautaire
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Involved */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-5">
              S'impliquer
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/support"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Faire un don
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Bénévolat
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-gray-400 hover:text-emerald-400 text-sm transition-colors"
                >
                  Parrainer un programme
                </Link>
              </li>
              {isAuthenticated ? (
                <li>
                  <Link
                    to="/geo-admin"
                    className="text-emerald-400 text-sm inline-flex items-center gap-1.5"
                  >
                    <Database size={13} /> Geo Admin
                  </Link>
                </li>
              ) : (
                <li>
                  <Link
                    to="/geo-admin"
                    className="text-gray-600 text-sm inline-flex items-center gap-1.5 group"
                  >
                    <Lock size={12} /> Geo Admin
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity">
                      Se connecter
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-5">
              Contact
            </h4>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Phone size={14} className="text-emerald-500/50" />
                {countryMeta.phone}
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail size={14} className="text-emerald-500/50" />
                contact@artihuman{countryMeta.tld}
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <GlobeIcon size={14} className="text-emerald-500/50" />
                {countryMeta.flag} {countryMeta.name}
              </li>
            </ul>

            <p className="text-gray-500 text-[11px] uppercase tracking-[0.15em] mb-3">
              Infolettre
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Votre email"
                className="flex-1 min-w-0 px-3 py-2 rounded-l-lg bg-white/[0.03] border border-slate-800 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40"
              />
              <button className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 rounded-r-lg text-sm font-medium hover:from-emerald-400 hover:to-teal-500 transition-all">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-800/60 mb-6" />

        <div className="text-center">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()}{" "}
            <span className="notranslate">ArtiHuman Foundation</span>. Tous
            droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

// Filter options
const categoryOptions: FilterOption[] = [
  { value: "technology", label: "Technologie" },
  { value: "retail", label: "Commerce de détail" },
  { value: "service", label: "Service" },
  { value: "manufacturing", label: "Fabrication" },
  { value: "hospitality", label: "Hôtellerie" },
  { value: "agriculture", label: "Agriculture" },
  { value: "healthcare", label: "Santé" },
  { value: "education", label: "Éducation" },
];

const locationOptions: FilterOption[] = [
  { value: "capital", label: "Capitale" },
  { value: "north", label: "Région Nord" },
  { value: "south", label: "Région Sud" },
  { value: "east", label: "Région Est" },
  { value: "west", label: "Région Ouest" },
  { value: "central", label: "Région Centre" },
  { value: "coastal", label: "Zone côtière" },
  { value: "rural", label: "Zone rurale" },
];

const rangeOptions: FilterOption[] = [
  { value: "near-me", label: "Près de ma position" },
  { value: "5", label: "Dans un rayon de 5 km" },
  { value: "10", label: "Dans un rayon de 10 km" },
  { value: "25", label: "Dans un rayon de 25 km" },
  { value: "50", label: "Dans un rayon de 50 km" },
  { value: "any", label: "Toute distance" },
];

// All 195 business categories from the database
const ALL_CATEGORIES = [
  "Commerce",
  "Hotels",
  "Restaurants",
  "Building & Construction",
  "Construction Companies",
  "Construction Materials",
  "Automotive & Motorbike",
  "Finance",
  "Banks",
  "Insurance",
  "Entertainment",
  "Tourism & Leisure",
  "Health",
  "Hospitals",
  "Medical Labs",
  "Pharmacies",
  "Dental",
  "Mental Health Services",
  "Veterinary Services",
  "Food & Beverage",
  "Food Processing",
  "Agri-Food & Agribusiness",
  "Bakeries",
  "Telecommunications",
  "Real Estate",
  "Real Estate Agencies",
  "Real Estate Developers",
  "Electrical Installation",
  "Plumbing Services",
  "HVAC Services",
  "Carpentry",
  "Welding Services",
  "Painting Services",
  "Roofing",
  "Flooring Services",
  "Landscaping",
  "Pest Control",
  "Cleaning Services",
  "Maintenance Services",
  "Security Services",
  "Transportation & Logistics",
  "Shipping & Courier",
  "Warehousing",
  "Storage Facilities",
  "IT Services",
  "Software Development",
  "Web Design & Development",
  "Cloud Services",
  "Data Analytics",
  "Cybersecurity",
  "Business Consulting",
  "Management Consulting",
  "Financial Consulting",
  "Legal Services",
  "Accounting Services",
  "Auditing Services",
  "Tax Consulting",
  "Education",
  "Schools",
  "Universities",
  "Training Centers",
  "Online Education",
  "Language Schools",
  "Beauty & Personal Care",
  "Hair Salons",
  "Spa & Wellness",
  "Fitness Centers",
  "Gym",
  "Yoga Studios",
  "Personal Training",
  "Massage Therapy",
  "Travel & Tourism",
  "Travel Agencies",
  "Hotels",
  "Hostels & Guesthouses",
  "Tour Operators",
  "Car Rental",
  "Media & Entertainment",
  "Publishing",
  "Broadcasting",
  "Music Production",
  "Photography Services",
  "Video Production",
  "Advertising Agencies",
  "Marketing Agencies",
  "PR & Communications",
  "Graphic Design",
  "Interior Design",
  "Architecture",
  "Engineering Services",
  "Manufacturing",
  "Automotive Manufacturing",
  "Electronics Manufacturing",
  "Textile Manufacturing",
  "Furniture Manufacturing",
  "Retail",
  "Department Stores",
  "Specialty Retail",
  "E-commerce",
  "Wholesale",
  "Distribution Centers",
  "Hospitality",
  "Catering Services",
  "Event Planning",
  "Banquet Halls",
  "Conference Centers",
  "Hotels & Resorts",
  "Automotive",
  "Car Dealerships",
  "Auto Repair Shops",
  "Auto Parts",
  "Gas Stations",
  "Car Wash",
  "Tire Services",
  "Rental Services",
  "Equipment Rental",
  "Tool Rental",
  "Party Supplies Rental",
  "Costume Rental",
  "Vehicle Rental",
  "Energy & Utilities",
  "Electric Companies",
  "Water Companies",
  "Gas Companies",
  "Renewable Energy",
  "Solar Services",
  "Agriculture",
  "Crop Production",
  "Livestock Farming",
  "Aquaculture",
  "Forestry",
  "Mining & Quarrying",
  "Construction & Aggregates",
  "Precious Metals & Gems",
  "Environmental Services",
  "Waste Management",
  "Recycling Services",
  "Environmental Consulting",
  "Government & Administration",
  "Local Government",
  "National Government",
  "Public Administration",
  "Social Services",
  "NGO & Non-Profit",
  "Charity Organizations",
  "Relief Organizations",
  "Community Services",
  "Professional Services",
  "Staffing & Recruitment",
  "Temporary Staffing",
  "Executive Search",
  "Payroll Services",
  "HR Consulting",
  "Testing & Certification",
  "Inspection Services",
  "Appraisal Services",
  "Notary Services",
  "Translation Services",
  "Interpretation Services",
  "Personal Services",
  "Laundry Services",
  "Tailoring & Alterations",
  "Shoe Repair",
  "Watch Repair",
  "Jewelry Repair",
  "Furniture Repair",
  "Appliance Repair",
  "Electronics Repair",
  "Printing & Publishing",
  "Commercial Printing",
  "Digital Printing",
  "Bookbinding",
  "Office Supplies",
  "Office Equipment",
  "Office Furniture",
  "Stationery",
  "Packaging & Supplies",
  "Industrial Supplies",
  "Safety Equipment",
  "Tools & Hardware",
  "Building Materials",
  "Lumber Yard",
  "Paint & Finishing",
  "Plumbing Supplies",
  "Electrical Supplies",
  "HVAC Supplies",
  "Home Improvement",
  "Appliances",
  "Kitchen Equipment",
  "Bathroom Fixtures",
  "Doors & Windows",
  "Lighting Fixtures",
  "Garden & Outdoor",
  "Plants & Nursery",
  "Garden Equipment",
  "Outdoor Furniture",
  "Pools & Spas",
  "Veterinary Supplies",
  "Pet Stores",
  "Pet Grooming",
  "Pet Boarding",
  "Animal Training",
];

// Collapsible section toggle — always-mounted to preserve GSAP DOM refs
function ShowcaseToggle({
  label,
  icon,
  isOpen,
  onToggle,
  gradient,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  gradient: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mb-1">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full group flex items-center justify-between px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 ${gradient} text-white transition-all duration-300 hover:brightness-110 hover:-translate-y-[1px] cursor-pointer border border-white/20 rounded-lg shadow-lg shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/15 ring-1 ring-white/20">
            {icon}
          </span>
          <span className="text-xs sm:text-sm md:text-base font-semibold tracking-wide">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-white/70 font-semibold hidden sm:inline px-2 py-0.5 rounded-full bg-white/10 ring-1 ring-white/15">
            {isOpen ? "Réduire" : "Développer"}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 ring-1 ring-white/20"
          >
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80 group-hover:text-white transition-colors" />
          </motion.div>
        </div>
      </button>
      <motion.div
        animate={
          isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }
        }
        initial={false}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  );
}

// --- Motto translations for the animated watermark ---
// Keys MUST match the language codes from country-language.ts exactly
// (e.g. "zh-CN" not "zh", "en" not omitted).
const MOTTO_TRANSLATIONS: Record<string, string> = {
  fr: "DROIT AU BUT",
  en: "STRAIGHT TO THE POINT",
  es: "DIRECTO AL GRANO",
  de: "DIREKT AUF DEN PUNKT",
  ar: "مباشرة إلى النقطة",
  pt: "DIRETO AO PONTO",
  it: "DRITTO AL PUNTO",
  nl: "RECHT VOOR Z'N RAAP",
  ja: "単刀直入",
  "zh-CN": "开门见山",
  "zh-TW": "開門見山",
  ko: "단도직입",
  ru: "ПРЯМО В ТОЧКУ",
  hi: "सीधे मुद्दे पर",
  tr: "DOĞRUDAN KONUYA",
  pl: "PROSTO DO CELU",
  sv: "RAKT PÅ SAK",
  ro: "DIRECT LA SUBIECT",
  uk: "ПРЯМО ДО СУТІ",
  el: "ΚΑΤΕΥΘΕΙΑΝ ΣΤΟ ΨΗΤΟ",
  cs: "PŘÍMO K VĚCI",
  da: "LIGE TIL SAGEN",
  fi: "SUORAAN ASIAAN",
  hu: "EGYENESEN A LÉNYEGRE",
  no: "RETT PÅ SAK",
  th: "ตรงประเด็น",
  vi: "ĐI THẲNG VÀO VẤN ĐỀ",
  id: "LANGSUNG KE INTINYA",
  ms: "TERUS KEPADA INTI",
  tl: "DIRETSO SA PUNTO",
  sw: "MOJA KWA MOJA",
  he: "ישר לעניין",
  bn: "সরাসরি মূল কথায়",
  hr: "RAVNO U SRIDU",
  sr: "ПРАВО У ЦЕНТАР",
  bg: "НАПРАВО В ЦЕЛТА",
  sk: "PRIAMO K VECI",
  sl: "NARAVNOST K BISTVU",
  et: "OTSE ASJA JUURDE",
  lv: "TIEŠI PIE LIETAS",
  lt: "TIESIAI Į ESMĘ",
  my: "တိုက်ရိုက်အချက်ကို",
  km: "ត្រង់ចំណុច",
  lo: "ກົງໄປທີ່ຈຸດ",
  am: "ቀጥታ ወደ ነጥቡ",
  fa: "مستقیم به هدف",
  ka: "პირდაპირ საქმეზე",
  hy: "ՈՒՂԻՂ ՆՊԱՏdelays",
  az: "BİRBAŞA MƏQSƏDƏ",
  uz: "TO'G'RIDAN-TO'G'RI MAQSADGA",
  tk: "GÖNI MAKSADA",
  mn: "ШУУД ЗОРИЛГОДОО",
  ne: "सिधै मुद्दामा",
  si: "කෙලින්ම කාරණයට",
};

const ENGLISH_MOTTO = "STRΔΦGHT TΩ THΞ PΩΦΠT";

function MottoFlip() {
  const { currentLang } = useLanguage();
  const [showTranslation, setShowTranslation] = useState(false);

  const translated = MOTTO_TRANSLATIONS[currentLang] || null;
  const isBase = isBaseLang(currentLang);

  useEffect(() => {
    // Only animate if there's a non-base language selected
    if (!translated || isBase) {
      setShowTranslation(false);
      return;
    }
    const interval = setInterval(() => {
      setShowTranslation((prev) => !prev);
    }, 3500);
    return () => clearInterval(interval);
  }, [translated, isBase]);

  const displayed = showTranslation && translated ? translated : ENGLISH_MOTTO;

  return (
    <div className="mt-10 notranslate" style={{ minHeight: "1.5rem" }}>
      <AnimatePresence mode="wait">
        <motion.p
          key={displayed}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="text-white/25 select-none pointer-events-none"
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: "0.75rem",
            letterSpacing: "0.5em",
          }}
        >
          {displayed}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// MAIN HOME COMPONENT
export default function Home() {
  // Inject gold text styles
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = goldTextStyles;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const { isAuthenticated } = useSubscription();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const { selectedCountry } = useCountry();
  const countryMeta = getCountryMeta(selectedCountry || "");

  // Dynamic home stats from API
  const [homeStats, setHomeStats] = useState<{
    businessCount: number;
    artisanCount: number;
    categoryCount: number;
    featuredArtisans: any[];
  }>({
    businessCount: 0,
    artisanCount: 0,
    categoryCount: 0,
    featuredArtisans: [],
  });

  // Fetch home stats when country changes
  useEffect(() => {
    const fetchHomeStats = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedCountry) params.set("countryCode", selectedCountry);
        const res = await fetch(`${API_BASE_URL}/api/home/stats?${params}`);
        const json = await res.json();
        if (json.success) {
          setHomeStats({
            businessCount: json.businessCount || 0,
            artisanCount: json.artisanCount || 0,
            categoryCount: json.categoryCount || 0,
            featuredArtisans: json.featuredArtisans || [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch home stats:", err);
      }
    };
    fetchHomeStats();
  }, [selectedCountry]);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [isCulturalModalOpen, setIsCulturalModalOpen] = useState(false);
  useScrollLock(isCulturalModalOpen);
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [showTopRatedOnly, setShowTopRatedOnly] = useState(false);

  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [totalDatabaseCount, setTotalDatabaseCount] = useState(0);
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(
    null,
  );

  // ═══ AI Search Mode (Shared Brain) ═══
  const [searchMode, setSearchMode] = useState<"classic" | "ai">("classic");
  const [aiResults, setAiResults] = useState<any>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Annuaire Musicale (artist directory) state
  const [artistAnnuaireQuery, setArtistAnnuaireQuery] = useState("");
  const [selectedArtistGenre, setSelectedArtistGenre] = useState("");
  const [selectedArtistCountry, setSelectedArtistCountry] = useState("");
  const [artistAnnuaireResults, setArtistAnnuaireResults] = useState<any[]>([]);
  const [artistAnnuaireGenres, setArtistAnnuaireGenres] = useState<string[]>(
    [],
  );
  const [artistAnnuaireCountries, setArtistAnnuaireCountries] = useState<
    string[]
  >([]);
  const [isArtistAnnuaireSearching, setIsArtistAnnuaireSearching] =
    useState(false);
  const [artistAnnuaireHasSearched, setArtistAnnuaireHasSearched] =
    useState(false);
  const [artistAnnuaireTotalResults, setArtistAnnuaireTotalResults] =
    useState(0);

  const helpSectionRef = useRef<HTMLDivElement>(null);
  const cardsSectionRef = useRef<HTMLDivElement>(null);
  const panelsContainerRef = useRef<HTMLDivElement>(null);
  const panelsWrapperRef = useRef<HTMLDivElement>(null);

  // Collapsible showcase sections — only annuaire + music label
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const saved = localStorage.getItem("va_showcase_sections");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "va_showcase_sections",
      JSON.stringify(expandedSections),
    );
  }, [expandedSections]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedLocationQuery = useDebounce(locationQuery, 500);

  // Number of panels
  const NUM_PANELS = 4;

  // Load initial data from database (filtered by detected country)
  const loadInitialData = async () => {
    try {
      const params: SearchParams = { query: "", limit: 5 };
      if (selectedCountry) params.countryCode = selectedCountry;
      const result = await searchBusinessesAPI(params);
      if (result.success && result.data.length > 0) {
        setSearchResults(result.data.slice(0, 5)); // Show first 5 businesses
        setTotalDatabaseCount(result.totalInDatabase || result.total);
        setHasSearched(true);
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  };

  // Test database connection on mount - DON'T load data until user searches
  useEffect(() => {
    const initializeDatabase = async () => {
      const result = await testDatabaseConnection();
      // Only mark as disconnected if success is false AND connected is false
      // If success is true, always mark as connected
      const connected = result.success === true;
      setDatabaseConnected(connected);

      if (connected) {
        // Load latest businesses so users can browse without searching
        // NOTE: country filtering happens via handleSearch / searchBusinessesAPI
        // Initial load deferred to handleSearch effect which passes selectedCountry
        try {
          const params: SearchParams = { query: "", limit: 5 };
          if (selectedCountry) params.countryCode = selectedCountry;
          const result = await searchBusinessesAPI(params);
          if (result.success) {
            setTotalDatabaseCount(result.totalInDatabase || result.total);
            if (result.data.length > 0) {
              setSearchResults(result.data.slice(0, 5));
              setHasSearched(true);
            }
          }
        } catch (error) {
          console.error("Failed to get database count:", error);
        }
      } else {
        console.error("❌ Database connection failed", result.database?.error);
        setSearchError("Unable to connect to database");
      }
    };

    initializeDatabase();
  }, [selectedCountry]);

  // FIXED: Smooth zoom-out → slide → zoom-in effect
  useLayoutEffect(() => {
    if (!panelsWrapperRef.current || !panelsContainerRef.current) return;

    // Mobile config — ignoreMobileResize prevents recalc on address-bar hide/show
    ScrollTrigger.config({ ignoreMobileResize: true });
    // NOTE: normalizeScroll intentionally NOT used — it intercepts all
    // touch/wheel events through JS causing jank. Each panel has
    // touch-action: pan-y in its inline styles instead.

    // Kill all existing ScrollTriggers for panels
    ScrollTrigger.getAll().forEach((trigger: ScrollTrigger) => {
      if (trigger.vars.id === "panels-scroll") {
        trigger.kill();
      }
    });

    const ctx = gsap.context(() => {
      // Set initial state
      gsap.set(panelsContainerRef.current, {
        x: 0,
        force3D: true,
      });

      // SIMPLIFIED: one continuous linear slide, driven 1:1 by scroll.
      // The previous version layered separate zoom-out/slide/zoom-in tweens
      // on manually-guessed time offsets ("start+=X-0.2") — at variable
      // scroll speed or when reversing direction those overlapping tweens
      // fell out of sync with each other and with the scrub lag, which is
      // what caused the "fighting"/shifting feel. A single tween can't
      // fight itself, so this is inherently smooth in both directions.
      gsap.to(panelsContainerRef.current, {
        x: `-${((NUM_PANELS - 1) * 100) / NUM_PANELS}%`,
        ease: "none",
        force3D: true,
        scrollTrigger: {
          id: "panels-scroll",
          trigger: panelsWrapperRef.current,
          pin: true,
          pinSpacing: true,
          scrub: 2.5, // Higher = more inertia — panels "catch up" slowly like a bike chain
          start: "top top",
          end: () => `+=${window.innerHeight * (NUM_PANELS - 1) * 1.0}`, // Longer scroll = slower, more deliberate transitions
          invalidateOnRefresh: true,
          anticipatePin: 1,
          markers: false,
        },
      });
    });

    // Refresh ScrollTrigger
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    // After any refresh, ensure the pin spacer has no stray margin-left
    // (can happen when body overflow changes during panel open/close)
    const onRefresh = () => {
      const spacer = document.querySelector(
        ".pin-spacer-panels-scroll",
      ) as HTMLElement | null;
      if (
        spacer &&
        spacer.style.marginLeft &&
        spacer.style.marginLeft !== "0px"
      ) {
        spacer.style.marginLeft = "";
      }
    };
    ScrollTrigger.addEventListener("refresh", onRefresh);

    return () => {
      ctx.revert();
      clearTimeout(refreshTimeout);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
    };
  }, []);

  // Refresh ScrollTrigger when search results change
  useEffect(() => {
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    return () => clearTimeout(refreshTimeout);
  }, [searchResults.length, showAllResults, filtersVisible]);

  // Cookie consent check
  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) setTimeout(() => setShowCookieConsent(true), 2000);
  }, []);

  const handleCookieAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowCookieConsent(false);
  };

  const handleCookieDecline = () => {
    localStorage.setItem("cookieConsent", "declined");
    setShowCookieConsent(false);
  };

  // Gentle slide effect for cards when they appear - FIXED
  useLayoutEffect(() => {
    if (!cardsSectionRef.current || searchResults.length === 0) return;

    // Kill any existing ScrollTriggers for cards
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger.trigger === cardsSectionRef.current) {
        trigger.kill();
      }
    });

    // Small delay to ensure DOM is ready
    const animateCards = setTimeout(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".business-card");

      if (cards.length > 0) {
        // Create gentle entrance animation that completes and stays
        gsap.from(cards, {
          y: 60,
          opacity: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: "power2.out",
          clearProps: "y,opacity", // Clear properties after animation completes
          scrollTrigger: {
            trigger: cardsSectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none", // Only play once, never reverse
            once: true, // Only trigger once
            markers: false,
          },
        });
      }
    }, 50);

    return () => {
      clearTimeout(animateCards);
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === cardsSectionRef.current) {
          trigger.kill();
        }
      });
    };
  }, [searchResults.length]);

  // Search handler - ONLY uses database
  const handleSearch = useCallback(async () => {
    if (
      !debouncedSearchQuery.trim() &&
      !debouncedLocationQuery.trim() &&
      activeFilters.length === 0
    ) {
      // If no search criteria, show latest businesses from database (filtered by country)
      try {
        const params: SearchParams = { query: "", limit: 5 };
        if (selectedCountry) params.countryCode = selectedCountry;
        const result = await searchBusinessesAPI(params);
        if (result.success && result.data.length > 0) {
          setSearchResults(result.data.slice(0, 5));
          setTotalDatabaseCount(result.totalInDatabase || result.total);
          setHasSearched(true);
        } else {
          setSearchResults([]);
          setHasSearched(false);
        }
      } catch {
        setSearchResults([]);
        setHasSearched(false);
      }
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setHasSearched(true);

    const searchParams: SearchParams = {
      query: debouncedSearchQuery,
      limit: 5, // Limit to 5 results for initial display
    };

    if (debouncedLocationQuery.trim()) {
      searchParams.location = debouncedLocationQuery.toLowerCase();
    }

    if (selectedCountry) {
      searchParams.countryCode = selectedCountry;
    }

    activeFilters.forEach((filter) => {
      if (filter.id.startsWith("category-")) {
        searchParams.category = filter.value;
      } else if (filter.id.startsWith("location-")) {
        searchParams.location = filter.value;
      } else if (filter.id.startsWith("range-")) {
        searchParams.range = filter.value;
      }
    });

    if (userLocation) {
      searchParams.lat = userLocation.lat;
      searchParams.lng = userLocation.lng;
    }

    try {
      const result = await searchBusinessesAPI(searchParams);
      if (result.success) {
        setSearchResults(result.data);
        setTotalDatabaseCount(result.totalInDatabase || result.total || 0);
      } else {
        setSearchError(result.error || "Failed to fetch results");
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      setSearchError("An error occurred during search");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [
    debouncedSearchQuery,
    debouncedLocationQuery,
    activeFilters,
    userLocation,
    selectedCountry,
    databaseConnected,
  ]);

  // Auto-search on query changes
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  // Handle scroll indicator visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY === 0) {
        setShowScrollIndicator(true);
      } else {
        setShowScrollIndicator(false);
      }
    };

    if (window.scrollY === 0) {
      setShowScrollIndicator(true);
    } else {
      setShowScrollIndicator(false);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }

    setIsGettingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsGettingLocation(false);

        if (!activeFilters.some((f) => f.id === "range-near-me")) {
          addFilter("range", "near-me", "Near My Location");
        }
      },
      () => {
        setIsGettingLocation(false);
        setLocationError("Could not get location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [activeFilters]);

  useEffect(() => {
    if (
      activeFilters.some((f) => f.id === "range-near-me") &&
      !userLocation &&
      !isGettingLocation
    ) {
      getUserLocation();
    }
  }, [activeFilters, userLocation, isGettingLocation, getUserLocation]);

  const addFilter = (type: string, value: string, label: string) => {
    const filtered = activeFilters.filter((f) => !f.id.startsWith(`${type}-`));
    const newFilter: ActiveFilter = {
      id: `${type}-${value}`,
      label,
      value,
    };
    setActiveFilters([...filtered, newFilter]);
  };

  const removeFilter = (id: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchQuery("");
    setLocationQuery("");
    setHasSearched(false);
    setSearchResults([]);
    setShowAllResults(false);
    setShowTopRatedOnly(false);
    setAiResults(null);

    // Reload initial data
    if (databaseConnected) {
      loadInitialData();
    }
  };

  const rankedSearchResults = showTopRatedOnly
    ? [...searchResults].sort(
        (a, b) => Number(b.rating || 0) - Number(a.rating || 0),
      )
    : searchResults;

  const databaseResultsHref = (() => {
    const params = new URLSearchParams();
    if (selectedCountry) params.set("countryCode", selectedCountry);
    if (showTopRatedOnly) params.set("sortBy", "rating");
    const qs = params.toString();
    return qs ? `/database-results?${qs}` : "/database-results";
  })();

  // ═══ AI Intent Search Handler (Shared Brain) ═══
  const handleAiSearch = useCallback(async () => {
    const query = debouncedSearchQuery.trim();
    if (!query || searchMode !== "ai") return;

    setIsAiSearching(true);
    setSearchError("");
    setHasSearched(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/search/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 5 }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setAiResults(data);
        // Also populate standard search results from AI matches for consistent display
        if (data.results?.businesses?.length > 0) {
          const mapped = data.results.businesses.map((b: any) => ({
            id: b.id?.toString() || "",
            title: b.name || "",
            description: b.description || "",
            category: b.categoryName || "",
            location: b.city || b.country || "",
            address: b.address || "",
            phone: b.phone || "",
            email: b.email || "",
            rating: b.rating || 0,
            reviews: 0,
            tags: [],
            latitude: 0,
            longitude: 0,
            created_at: new Date().toISOString(),
          }));
          setSearchResults(mapped);
          setTotalDatabaseCount(data.results.totalMatches || mapped.length);
        } else {
          setSearchResults([]);
        }
      } else {
        setSearchError(data.error || "AI search failed");
        setAiResults(null);
      }
    } catch (err: any) {
      console.error("AI search error:", err);
      setSearchError("AI search temporarily unavailable — try classic mode");
      setAiResults(null);
    } finally {
      setIsAiSearching(false);
    }
  }, [debouncedSearchQuery, searchMode]);

  // Trigger AI search when mode is AI and query changes
  useEffect(() => {
    if (searchMode === "ai" && debouncedSearchQuery.trim()) {
      handleAiSearch();
    }
  }, [handleAiSearch, searchMode, debouncedSearchQuery]);

  // Annuaire Musicale — fetch genres and countries on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [genresRes, countriesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/artists/genres`),
          fetch(`${API_BASE_URL}/api/artists/countries`),
        ]);
        const genresJson = await genresRes.json();
        if (genresJson.success) setArtistAnnuaireGenres(genresJson.data || []);
        const countriesJson = await countriesRes.json();
        if (countriesJson.success)
          setArtistAnnuaireCountries(countriesJson.data || []);
      } catch (e) {
        console.error("Failed to fetch artist filters:", e);
      }
    };
    fetchFilters();
  }, []);

  // Debounced search - auto-fetch artist annuaire after user stops typing
  const artistSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useEffect(() => {
    if (artistSearchTimerRef.current)
      clearTimeout(artistSearchTimerRef.current);

    artistSearchTimerRef.current = setTimeout(() => {
      handleArtistAnnuaireSearch();
    }, 300);

    return () => {
      if (artistSearchTimerRef.current)
        clearTimeout(artistSearchTimerRef.current);
    };
  }, [artistAnnuaireQuery, selectedArtistGenre, selectedArtistCountry]);

  // Annuaire Musicale — search handler
  const handleArtistAnnuaireSearch = async () => {
    setIsArtistAnnuaireSearching(true);
    try {
      const params = new URLSearchParams({
        limit: "12",
        sort_by: "name_asc",
      });
      if (artistAnnuaireQuery.trim())
        params.set("query", artistAnnuaireQuery.trim());
      if (selectedArtistGenre) params.set("genre", selectedArtistGenre);
      if (selectedArtistCountry)
        params.set("countryCode", selectedArtistCountry);
      const res = await fetch(`${API_BASE_URL}/api/artists/search?${params}`);
      const json = await res.json();
      if (json.success) {
        setArtistAnnuaireResults(json.data || []);
        setArtistAnnuaireTotalResults(json.total || 0);
      } else {
        setArtistAnnuaireResults([]);
      }
      setArtistAnnuaireHasSearched(true);
    } catch (error) {
      console.error("Artist search failed:", error);
      setArtistAnnuaireResults([]);
    }
    setIsArtistAnnuaireSearching(false);
  };

  const clearArtistAnnuaireFilters = () => {
    setArtistAnnuaireQuery("");
    setSelectedArtistGenre("");
    setSelectedArtistCountry("");
  };

  const scrollToHelpSection = () => {
    if (helpSectionRef.current) {
      helpSectionRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 relative overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/80 via-emerald-700/80 to-emerald-800/80" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animation: `floatParticle ${5 + i}s ease-in-out infinite ${i * 0.8}s`,
              }}
            />
          ))}
          <style>{`@keyframes floatParticle { 0%,100% { transform: translateY(0); opacity: 0.2; } 50% { transform: translateY(-80px); opacity: 0.7; } }`}</style>
        </div>

        <div className="relative z-10 text-center text-white max-w-[95vw] mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4 md:mb-6"
          >
            <span className="px-3 py-1 md:px-4 md:py-2 bg-white/10 rounded-full text-xs md:text-sm font-medium border border-white/20">
              🎨 Soutien aux artisans {countryMeta.nameIn}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 drop-shadow-2xl px-4 notranslate"
          >
            ArtiHuman Foundation
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl mb-4 text-white/90 px-4"
          >
            Soutenir les artisans et élever les communautés grâce à l'innovation
            humanitaire à travers {countryMeta.nameFr}
          </motion.p>

          {/* Database Connection Status */}
          {databaseConnected !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4"
            >
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  databaseConnected
                    ? "bg-green-900/30 text-green-300"
                    : "bg-yellow-900/30 text-yellow-300"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    databaseConnected ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
                <span className="text-sm font-medium">
                  {databaseConnected
                    ? "✅ Connecté à PostgreSQL"
                    : "❌ Connexion à la base de données échouée"}
                </span>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mt-6 md:mt-8 px-4"
          >
            <Link to="/get-involved">
              <Button className="bg-white text-emerald-600 px-6 py-4 md:px-10 md:py-6 rounded-xl md:rounded-2xl font-bold hover:bg-gray-100 transition-all text-base md:text-lg shadow-2xl hover:scale-105 w-full sm:w-auto">
                S'impliquer
              </Button>
            </Link>
            <Link to="/apply">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 md:px-10 md:py-6 rounded-xl md:rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all text-base md:text-lg shadow-2xl hover:scale-105 w-full sm:w-auto">
                ✨ Postuler
              </Button>
            </Link>
            <Link to="/ong-culturelle">
              <Button className="border-2 border-white text-white px-6 py-4 md:px-10 md:py-6 rounded-xl md:rounded-2xl font-bold hover:bg-white/10 transition-all text-base md:text-lg w-full sm:w-auto">
                En savoir plus
              </Button>
            </Link>
          </motion.div>

          {/* Signature watermark — flips between motto & translation */}
          <MottoFlip />
        </div>

        {showScrollIndicator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 cursor-pointer z-50"
            onClick={scrollToHelpSection}
          >
            <div className="w-8 h-12 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1.5 h-4 bg-gradient-to-b from-emerald-400 to-emerald-500 rounded-full mt-3"></div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Help/Search Section with Cards */}
      <section
        className="flex flex-col min-h-screen bg-gradient-to-br from-white to-emerald-50 items-center justify-center"
        ref={helpSectionRef}
      >
        <div className="w-full max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-8 md:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6">
              Découvrez les communautés artisanales
            </h2>
            <p className="text-lg md:text-2xl text-gray-600 px-4 max-w-3xl mx-auto">
              Parcourez notre répertoire de communautés artisanales et de
              programmes culturels à travers {countryMeta.nameFr}
            </p>
          </motion.div>

          <div className="max-w-[95vw] mx-auto mb-8 md:mb-12">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl md:rounded-[2rem] shadow-2xl p-4 md:p-6 border border-white/10">
              {/* Search Mode Toggle */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex bg-slate-700/50 rounded-full p-1 gap-1">
                  <button
                    onClick={() => {
                      setSearchMode("classic");
                      setAiResults(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      searchMode === "classic"
                        ? "bg-emerald-500 text-white shadow-lg"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    Classique
                  </button>
                  <button
                    onClick={() => setSearchMode("ai")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      searchMode === "ai"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    IA Intelligente
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <MagneticInput className="flex-1">
                  <div
                    className={`relative bg-slate-800/90 rounded-2xl md:rounded-3xl border transition-colors group ${
                      searchMode === "ai"
                        ? "border-purple-500/40 hover:border-purple-400/60"
                        : "border-emerald-500/40 hover:border-emerald-400/60"
                    }`}
                  >
                    {searchMode === "ai" ? (
                      <Sparkles className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                    ) : (
                      <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-emerald-400 w-5 h-5 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                    )}
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchMode === "ai"
                          ? "J'ai besoin d'un plombier urgent à Montréal..."
                          : "Rechercher des communautés, programmes..."
                      }
                      className="w-full pl-12 md:pl-20 pr-6 md:pr-8 py-4 md:py-6 bg-transparent border-none focus:outline-none text-white placeholder-emerald-100/60 text-base md:text-xl font-medium rounded-2xl md:rounded-3xl"
                    />
                    {isAiSearching && searchMode === "ai" && (
                      <Loader2 className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 text-purple-400 w-5 h-5 animate-spin" />
                    )}
                  </div>
                </MagneticInput>
                {searchMode === "classic" && (
                  <MagneticInput className="flex-1">
                    <div className="relative bg-slate-800/90 rounded-2xl md:rounded-3xl border border-emerald-500/40 hover:border-emerald-400/60 transition-colors group">
                      <MapPin className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-emerald-400 w-5 h-5 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                      <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        placeholder="Entrer un lieu..."
                        className="w-full pl-12 md:pl-20 pr-6 md:pr-8 py-4 md:py-6 bg-transparent border-none focus:outline-none text-white placeholder-emerald-100/60 text-base md:text-xl font-medium rounded-2xl md:rounded-3xl"
                      />
                    </div>
                  </MagneticInput>
                )}
              </div>

              {/* AI Intent Banner — shows parsed intent when AI mode active */}
              <AnimatePresence>
                {searchMode === "ai" && aiResults?.intent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-300 font-medium">
                        IA détecte:
                      </span>
                      {aiResults.intent.sectorLabel && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-200 rounded-full text-xs">
                          {aiResults.intent.sectorLabel}
                        </span>
                      )}
                      {aiResults.intent.location && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-200 rounded-full text-xs">
                          📍 {aiResults.intent.location}
                        </span>
                      )}
                      {aiResults.intent.urgency >= 7 && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-200 rounded-full text-xs animate-pulse">
                          🚨 Urgent
                        </span>
                      )}
                      <span className="text-slate-400 text-xs ml-auto">
                        {aiResults.meta?.elapsed} • confiance{" "}
                        {Math.round((aiResults.intent.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emergency banner when urgency >= 8 */}
              <AnimatePresence>
                {searchMode === "ai" && aiResults?.emergency?.isEmergency && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-3 p-4 rounded-xl bg-gradient-to-r from-red-600/90 to-orange-600/90 border border-red-400/30 shadow-lg shadow-red-500/20"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🚨</span>
                      <div>
                        <p className="text-white font-bold text-sm">
                          Situation urgente détectée
                        </p>
                        <p className="text-red-100 text-xs mt-1">
                          {aiResults.emergency.message}
                        </p>
                        {aiResults.emergency.topVerified?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {aiResults.emergency.topVerified
                              .slice(0, 3)
                              .map((b: any) => (
                                <a
                                  key={b.id}
                                  href={`/businesses/${b.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-white text-xs font-medium transition-colors"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  {b.name}
                                </a>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-center mt-6 md:mt-8">
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 15px 30px rgba(16, 185, 129, 0.4)",
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFiltersVisible(!filtersVisible)}
                className="flex items-center gap-3 md:gap-4 px-8 md:px-12 py-4 md:py-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full shadow-2xl text-white font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all border border-white/20 text-base md:text-lg"
              >
                <SlidersHorizontal className="w-5 h-5 md:w-6 md:h-6" />
                <span>Filtre avancé</span>
                <motion.div
                  animate={{ rotate: filtersVisible ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-5 h-5 md:w-6 md:h-6" />
                </motion.div>
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {activeFilters.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 justify-center mb-6 md:mb-8"
              >
                {activeFilters.map((filter) => (
                  <motion.span
                    key={filter.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2 md:gap-3 bg-emerald-100 text-emerald-800 px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm md:text-base font-medium"
                  >
                    {filter.label}
                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="hover:text-emerald-600"
                    >
                      <XCircle size={16} className="md:w-5 md:h-5" />
                    </button>
                  </motion.span>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-gray-500 hover:text-gray-700 underline text-sm md:text-base"
                >
                  Tout effacer
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {filtersVisible && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="max-w-[95vw] mx-auto mb-8 md:mb-12 overflow-hidden"
              >
                <div className="bg-gradient-to-br from-white to-emerald-50 rounded-3xl md:rounded-[2rem] p-6 md:p-10 shadow-2xl border border-emerald-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {[
                      {
                        label: "Catégorie artisanale",
                        options: categoryOptions,
                        type: "category",
                      },
                      {
                        label: "Type de programme",
                        options: categoryOptions,
                        type: "program-type",
                      },
                      {
                        label: "Lieu",
                        options: locationOptions,
                        type: "location",
                      },
                      {
                        label: "Distance",
                        options: rangeOptions,
                        type: "range",
                      },
                    ].map((section) => (
                      <div key={section.type}>
                        <label className="block text-sm md:text-base font-semibold text-gray-700 mb-2 md:mb-3">
                          {section.label}
                        </label>
                        <select
                          className="w-full p-3 md:p-4 border border-gray-300 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-base md:text-lg"
                          onChange={(e) =>
                            e.target.value &&
                            addFilter(
                              section.type,
                              e.target.value,
                              `${section.label}: ${e.target.selectedOptions[0].text}`,
                            )
                          }
                          value={
                            activeFilters.find((f) =>
                              f.id.startsWith(section.type),
                            )?.value || ""
                          }
                        >
                          <option value="">Sélectionner {section.label}</option>
                          {section.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 md:mt-8 flex flex-wrap gap-4 justify-center">
                    <button
                      onClick={getUserLocation}
                      disabled={isGettingLocation}
                      className="flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm md:text-base"
                    >
                      {isGettingLocation ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                      {isGettingLocation ? "Localisation..." : "Ma position"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {locationError && (
            <div className="max-w-[95vw] mx-auto mb-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm md:text-base text-center">
              {locationError}
            </div>
          )}
          {userLocation && (
            <div className="max-w-[95vw] mx-auto mb-4 p-3 md:p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm md:text-base text-center">
              ✅ Position détectée — Résultats proches de vous
            </div>
          )}

          {/* CARDS SECTION - Fixed cards display */}
          <div className="max-w-[95vw] mx-auto" ref={cardsSectionRef}>
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 md:py-24"
              >
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl md:rounded-[2rem] p-10 md:p-16 max-w-lg md:max-w-xl mx-auto shadow-2xl border border-emerald-200">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mb-8 md:mb-10"
                  >
                    <div className="relative w-20 h-20 md:w-28 md:h-28 mx-auto">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full opacity-30" />
                      <div className="relative w-20 h-20 md:w-28 md:h-28 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center shadow-2xl">
                        <Search className="h-10 w-10 md:h-14 md:w-14 text-white" />
                      </div>
                    </div>
                  </motion.div>
                  <h3 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent mb-3 md:mb-4">
                    Recherche dans la base PostgreSQL...
                  </h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-base md:text-lg">
                    Interrogation des communautés artisanales depuis la base
                    versoair_business_intelligence
                  </p>
                </div>
              </motion.div>
            )}

            {searchResults.length > 0 && (
              <div className="mb-12 md:mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 md:mb-12"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 md:mb-4">
                    <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                      🎨 Résultats des communautés artisanales
                    </h3>
                    {databaseConnected === false && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full mt-2 md:mt-0">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">
                          Erreur base de données
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-base md:text-xl">
                    {searchResults.length} communautés trouvées (max 5
                    affichées)
                    {userLocation && (
                      <span className="text-green-600 font-semibold ml-2 md:ml-3">
                        • Triés par distance
                      </span>
                    )}
                    {showTopRatedOnly && (
                      <span className="text-amber-600 font-semibold ml-2 md:ml-3">
                        • Top notés
                      </span>
                    )}
                    {databaseConnected && (
                      <span className="text-blue-600 font-semibold ml-2 md:ml-3">
                        • Depuis la base PostgreSQL
                      </span>
                    )}
                  </p>
                </motion.div>

                <div className="database-viewport relative overflow-x-hidden overflow-y-auto">
                  <div
                    className={`transition-all duration-300 ${
                      showAllResults
                        ? "max-h-[4000px]"
                        : "max-h-[650px] sm:max-h-[700px] lg:max-h-[600px]"
                    } overflow-y-auto overscroll-contain`}
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {rankedSearchResults
                        .slice(
                          0,
                          showAllResults
                            ? rankedSearchResults.length
                            : Math.min(5, rankedSearchResults.length),
                        )
                        .map((business, index) => (
                          <motion.div
                            key={business.id}
                            whileHover={{ y: -10, scale: 1.03 }}
                            className="business-card bg-white rounded-2xl md:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100"
                          >
                            <div className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                            <div className="p-6 md:p-8">
                              <div className="flex items-start justify-between mb-4 md:mb-6">
                                <div className="flex-1">
                                  <h4 className="text-lg md:text-2xl font-bold text-gray-900 mb-2 md:mb-3 line-clamp-1">
                                    {business.title}
                                  </h4>
                                  <div className="flex items-center gap-2 md:gap-3 text-gray-600">
                                    <MapPin className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
                                    <span className="text-sm md:text-base capitalize font-medium">
                                      {business.location}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 bg-gradient-to-br from-yellow-400 to-orange-500 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl shadow-xl">
                                  <Star className="h-4 w-4 md:h-6 md:w-6 fill-white text-white" />
                                  <span className="text-sm md:text-base font-bold text-white">
                                    {business.rating}
                                  </span>
                                </div>
                              </div>

                              {business.distance && (
                                <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-5 py-1.5 md:py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm font-bold mb-4 md:mb-6 shadow-lg">
                                  <Navigation className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
                                  {business.distance.toFixed(1)} km
                                </div>
                              )}

                              <p className="text-gray-700 text-sm md:text-base mb-6 md:mb-8 leading-relaxed line-clamp-2">
                                {business.description}
                              </p>

                              <div className="flex flex-wrap items-center justify-between pt-4 md:pt-6 border-t border-gray-100 gap-3">
                                <span className="px-3 md:px-5 py-1.5 md:py-2.5 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 rounded-full text-sm font-bold capitalize">
                                  {business.category}
                                </span>
                                {business.tags &&
                                  business.tags.length > 0 &&
                                  Array.isArray(business.tags) && (
                                    <div className="flex flex-wrap gap-1">
                                      {business.tags
                                        .slice(0, 2)
                                        .map((tag, i) => (
                                          <span
                                            key={i}
                                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                <Link
                                  to={`/business/${business.id}`}
                                  className="text-emerald-600 hover:text-emerald-700 text-sm md:text-base font-bold flex items-center gap-2"
                                >
                                  <span>Détails</span>
                                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>

                  {!showAllResults && searchResults.length > 3 && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                  )}
                </div>

                {/* STYLISH VIEW WHOLE RESULTS BUTTON */}
                <div className="text-center mt-8 md:mt-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => setShowTopRatedOnly((v) => !v)}
                        translate="no"
                        className={`notranslate px-6 py-4 rounded-full font-semibold text-sm md:text-base border transition-all ${
                          showTopRatedOnly
                            ? "bg-amber-500 text-white border-amber-500 shadow-lg"
                            : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                        }`}
                        title="Afficher les mieux notés dans le maximum de cartes affichées"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Star
                            className={`w-4 h-4 ${showTopRatedOnly ? "fill-current" : ""}`}
                          />
                          <span
                            className={showTopRatedOnly ? "hidden" : "inline"}
                          >
                            Top notés: OFF
                          </span>
                          <span
                            className={showTopRatedOnly ? "inline" : "hidden"}
                          >
                            Top notés: ON
                          </span>
                        </span>
                      </button>

                      <Link to={databaseResultsHref}>
                        <motion.button
                          whileHover={{
                            scale: 1.05,
                            boxShadow: "0 20px 40px rgba(16, 185, 129, 0.4)",
                          }}
                          whileTap={{ scale: 0.95 }}
                          className="group relative px-10 md:px-14 py-5 md:py-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-700 text-white rounded-full font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 text-lg md:text-xl flex items-center justify-center gap-4 mx-auto overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative z-10 flex items-center gap-3 md:gap-4">
                            <Database className="w-6 h-6 md:w-7 md:h-7" />
                            <span className="text-lg md:text-xl font-bold">
                              Voir toutes les communautés artisanales
                            </span>
                            <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform duration-300" />
                          </div>
                          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full blur-md opacity-30 group-hover:opacity-70 transition-opacity duration-300"></div>
                        </motion.button>
                      </Link>
                    </div>

                    <p className="text-gray-600 mt-4 text-sm md:text-base">
                      Explorez notre base de données complète de{" "}
                      {totalDatabaseCount}+ communautés artisanales
                    </p>
                  </motion.div>
                </div>
              </div>
            )}

            {hasSearched && !isSearching && searchResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 md:py-24"
              >
                <div className="bg-gradient-to-br from-white to-emerald-50 rounded-3xl md:rounded-[2rem] p-10 md:p-16 max-w-lg md:max-w-2xl mx-auto border-2 border-dashed border-emerald-200">
                  <Search className="h-20 w-20 md:h-28 md:w-28 mx-auto mb-6 md:mb-8 text-emerald-300" />
                  <h3 className="text-2xl md:text-4xl font-bold text-gray-800 mb-4 md:mb-6">
                    Aucun résultat
                  </h3>
                  <p className="text-gray-600 mb-8 md:mb-10 text-base md:text-lg">
                    Aucune entreprise ne correspond à vos critères de recherche
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-bold text-base md:text-lg shadow-xl"
                  >
                    Tout effacer et recommencer
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-6 mt-12 md:mt-16">
            {[
              {
                icon: User,
                text: "Profils artisans",
                desc: "Artisans qualifiés",
                href: "/artisans",
              },
              {
                icon: Palette,
                text: "Art & Artisanat",
                desc: "Créations artisanales",
                href: "/marketplace",
              },
              {
                icon: ShoppingBag,
                text: "Marché",
                desc: "Parcourir & acheter",
                notranslate: true,
                href: "/marketplace",
              },
              {
                icon: Users,
                text: "Communautés",
                desc: "Groupes locaux",
                href: "/communities",
              },
              {
                icon: Heart,
                text: "Nous soutenir",
                desc: "Financer la mission",
                href: "/sponsorship",
              },
              {
                icon: Calendar,
                text: "Événements",
                desc: "Ateliers & spectacles",
                href: "/divertissement",
              },
            ].map((item, i) => (
              <Link key={i} to={item.href}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.05 }}
                  className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 text-center border border-gray-100 shadow-lg hover:shadow-xl transition-all cursor-pointer h-[120px] md:h-[140px] flex flex-col items-center justify-center"
                >
                  <item.icon className="w-8 h-8 md:w-10 md:h-10 text-emerald-600 mb-2 md:mb-3 flex-shrink-0" />
                  <p
                    className={`font-semibold text-gray-800 text-sm md:text-base leading-tight ${"notranslate" in item && item.notranslate ? "notranslate" : ""}`}
                  >
                    {item.text}
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm mt-1 leading-tight">
                    {item.desc}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FIXED PANELS SECTION - Smooth zoom-out → slide → zoom-in */}
      <div
        className="panels-wrapper relative h-[100dvh] overflow-clip"
        ref={panelsWrapperRef}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="h-[100dvh] w-full overflow-clip"
          style={{ touchAction: "pan-y" }}
        >
          <div
            ref={panelsContainerRef}
            className="flex h-[100dvh]"
            style={{
              width: `${NUM_PANELS * 100}%`,
            }}
          >
            {/* PANEL 1: ArtiHuman Foundation - Emerald Gradient */}
            <div
              className="panel h-[100dvh] flex-shrink-0 relative overflow-hidden"
              style={{
                flexBasis: "100%",
                width: "100%",
                maxWidth: "100vw",
                touchAction: "pan-y",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.4)_0%,_transparent_60%),radial-gradient(ellipse_at_bottom_left,_rgba(110,231,183,0.4)_0%,_transparent_60%)]" />
              <div className="relative z-10 w-full h-full flex items-start sm:items-center justify-center pt-20 sm:pt-0 px-3 sm:px-4 lg:p-8">
                <div className="max-w-[95vw] w-full flex flex-col items-center justify-center max-h-full">
                  <div className="text-center mb-[1vw]">
                    <h2
                      className="gold-text mb-1 sm:mb-2 md:mb-3 notranslate"
                      data-text="ArtiHuman Foundation"
                    >
                      <span
                        className="gold-text__shine"
                        data-text="ArtiHuman Foundation"
                      >
                        ArtiHuman Foundation
                      </span>
                    </h2>
                    <div
                      className="hidden sm:inline-block"
                      style={{ animation: "spin 20s linear infinite" }}
                    >
                      <Sparkles className="w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 mx-auto mb-2 md:mb-4 text-white" />
                    </div>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-1 sm:mb-2 md:mb-4 text-center max-w-2xl mx-auto px-2">
                      Soutenir les artisans et élever les communautés grâce à
                      l'innovation humanitaire à travers {countryMeta.nameFr}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-6 w-full max-w-[95vw] mb-2 sm:mb-3 md:mb-6">
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/15 rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer group"
                    >
                      <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-1 sm:gap-2">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:text-emerald-300 transition-colors" />
                        Notre impact {countryMeta.nameIn} :
                      </h3>
                      <div className="space-y-1 sm:space-y-2">
                        {[
                          {
                            stat:
                              homeStats.artisanCount > 0
                                ? `${homeStats.artisanCount}+`
                                : "—",
                            label: "artisans soutenus",
                            icon: "👥",
                          },
                          {
                            stat:
                              homeStats.businessCount > 0
                                ? `${homeStats.businessCount}+`
                                : "—",
                            label: "entreprises enregistrées",
                            icon: "❤️",
                          },
                          {
                            stat:
                              homeStats.categoryCount > 0
                                ? `${homeStats.categoryCount}`
                                : "—",
                            label: "catégories d'industrie",
                            icon: "🏢",
                          },
                          {
                            stat: "Culturels",
                            label: "programmes du patrimoine",
                            icon: "🎨",
                          },
                          {
                            stat: "Programmes",
                            label: "de développement",
                            icon: "📚",
                          },
                          {
                            stat: "Partenariats",
                            label: "locaux éthiques",
                            icon: "🤝",
                          },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-300 rounded-full flex-shrink-0"></div>
                            <span className="text-white/90 text-xs sm:text-sm">
                              <span className="font-bold text-emerald-300">
                                {item.stat}
                              </span>{" "}
                              {item.label}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/15 rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer"
                    >
                      <div className="text-center mb-1 sm:mb-2">
                        <Sparkles
                          className="mx-auto mb-0.5 sm:mb-1 text-white"
                          size={14}
                        />
                        <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white">
                          Programmes culturels
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
                        {[
                          { icon: Trees, label: "Arts agricoles" },
                          { icon: Music, label: "Musique" },
                          { icon: Palette, label: "Art urbain" },
                          { icon: Users, label: "Communauté" },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="text-center p-1.5 sm:p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all cursor-pointer"
                          >
                            <item.icon
                              className="mx-auto mb-0.5 sm:mb-1 text-emerald-300"
                              size={16}
                            />
                            <span className="text-white text-[10px] sm:text-xs md:text-sm font-semibold">
                              {item.label}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                      <button
                        onClick={() => setIsCulturalModalOpen(true)}
                        className="w-full bg-gradient-to-r from-emerald-400 to-emerald-300 text-emerald-900 py-1.5 sm:py-2 rounded-lg font-bold hover:from-white hover:to-emerald-100 transition-all duration-300 text-[10px] sm:text-xs md:text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Sparkles size={14} className="inline mr-1 sm:mr-2" />
                        Explorer les programmes
                      </button>
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-white/20 to-emerald-100/20 rounded-xl p-2 sm:p-3 md:p-6 text-center border border-white/20 w-full max-w-2xl hover:border-white/40 transition-all cursor-pointer group"
                  >
                    <h3
                      className="text-base sm:text-xl md:text-3xl font-bold text-white mb-1 group-hover:text-emerald-200 transition-colors"
                      style={{ fontFamily: "'Alegreya', Georgia, serif" }}
                    >
                      Rejoignez notre mouvement
                    </h3>
                    <p className="text-white/90 mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">
                      Participez à la transformation des communautés par l'art,
                      la culture et l'innovation humanitaire
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/ong-culturelle">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-white text-emerald-700 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-emerald-50 transition-all duration-300 text-xs sm:text-sm shadow-md hover:shadow-lg"
                        >
                          En savoir plus
                        </motion.button>
                      </Link>
                      <Link to="/artihuman-foundation">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="border-2 border-white text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-white/10 transition-all duration-300 text-xs sm:text-sm"
                        >
                          Nous soutenir
                        </motion.button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* PANEL 2: Artisan Marketplace - Amber Gradient */}
            <div
              className="panel h-[100dvh] flex-shrink-0 relative overflow-clip"
              style={{
                flexBasis: "100%",
                width: "100%",
                maxWidth: "100vw",
                touchAction: "pan-y",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center_right,_rgba(253,186,116,0.4)_0%,_transparent_60%),radial-gradient(ellipse_at_bottom_left,_rgba(252,211,77,0.4)_0%,_transparent_60%)]" />
              <div className="relative z-10 w-full h-full flex items-start sm:items-center justify-center pt-20 sm:pt-0 px-3 sm:px-4 lg:p-8">
                <div className="max-w-[95vw] w-full flex flex-col items-center justify-center max-h-full">
                  <div className="text-center mb-[1vw]">
                    <h2
                      className="gold-text mb-1 sm:mb-2 md:mb-3 notranslate"
                      data-text="Marché Artisanal"
                    >
                      <span
                        className="gold-text__shine notranslate"
                        data-text="Marché Artisanal"
                      >
                        Marché Artisanal
                      </span>
                    </h2>
                    <div
                      className="hidden sm:inline-block"
                      style={{
                        animation: "panelIconFloat 2s ease-in-out infinite",
                      }}
                    >
                      <ShoppingBag className="w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 mx-auto mb-2 md:mb-4 text-white" />
                    </div>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-1 sm:mb-2 md:mb-4 text-center max-w-2xl mx-auto px-2">
                      Découvrez des produits artisanaux uniques qui soutiennent
                      les communautés et préservent l'artisanat traditionnel{" "}
                      {countryMeta.demonym}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-6 w-full max-w-[95vw] mb-2 sm:mb-3 md:mb-6">
                    {/* Left card: Featured Products */}
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/15 rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer group"
                    >
                      <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-1 sm:gap-2">
                        <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:text-amber-300 transition-colors" />
                        Produits vedettes
                      </h3>
                      <div className="space-y-1 sm:space-y-2">
                        {[
                          {
                            name: "Set de poterie artisanale",
                            price: `149.99 ${countryMeta.currencySymbol}`,
                            rating: 4.8,
                            badge: "Meilleure vente",
                            emoji: "🏺",
                          },
                          {
                            name: "Textiles tissés main",
                            price: `89.99 ${countryMeta.currencySymbol}`,
                            rating: 4.9,
                            badge: "Nouveauté",
                            emoji: "🧵",
                          },
                          {
                            name: "Sculptures en bois",
                            price: `199.99 ${countryMeta.currencySymbol}`,
                            rating: 5.0,
                            badge: "Premium",
                            emoji: "🪵",
                          },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-300 rounded-full flex-shrink-0"></div>
                            <span className="text-white/90 text-xs sm:text-sm">
                              <span className="font-bold text-amber-300">
                                {item.emoji} {item.name}
                              </span>{" "}
                              — {item.price}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Right card: Shop Categories */}
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/15 rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer"
                    >
                      <div className="text-center mb-1 sm:mb-2">
                        <Sparkles
                          className="mx-auto mb-0.5 sm:mb-1 text-white"
                          size={14}
                        />
                        <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white">
                          Catégories boutique
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
                        {[
                          { icon: Palette, label: "Céramiques" },
                          { icon: Music, label: "Textiles" },
                          { icon: Trees, label: "Boiserie" },
                          { icon: Star, label: "Bijoux" },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="text-center p-1.5 sm:p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all cursor-pointer"
                          >
                            <item.icon
                              className="mx-auto mb-0.5 sm:mb-1 text-amber-300"
                              size={16}
                            />
                            <span className="text-white text-[10px] sm:text-xs md:text-sm font-semibold">
                              {item.label}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                      <Link to="/blog">
                        <button className="relative w-full bg-gradient-to-r from-amber-400 to-amber-300 text-amber-900 py-1.5 sm:py-2 rounded-lg font-bold hover:from-white hover:to-amber-100 transition-all duration-300 text-[10px] sm:text-xs md:text-sm shadow-lg hover:shadow-xl transform hover:scale-105 group">
                          <ShoppingBag
                            size={14}
                            className="inline mr-1 sm:mr-2"
                          />
                          Parcourir le marché
                          {/* Blinking marketplace hint */}
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-900/90 text-amber-200 text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none animate-pulse">
                            🛒 Voir la marketplace
                          </span>
                        </button>
                      </Link>
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-white/20 to-amber-100/20 rounded-xl p-2 sm:p-3 md:p-6 text-center border border-white/20 w-full max-w-2xl hover:border-white/40 transition-all cursor-pointer group"
                  >
                    <h3
                      className="text-base sm:text-xl md:text-3xl font-bold text-white mb-1 group-hover:text-amber-200 transition-colors"
                      style={{ fontFamily: "'Alegreya', Georgia, serif" }}
                    >
                      Soutenir les communautés
                    </h3>
                    <p className="text-white/90 mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">
                      Parcourez notre collection et faites la différence à
                      chaque achat
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/marketplace">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-white text-amber-700 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-amber-50 transition-all duration-300 text-xs sm:text-sm shadow-md hover:shadow-lg"
                        >
                          Acheter maintenant
                        </motion.button>
                      </Link>
                      <Link to="/marketplace">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="border-2 border-white text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-white/10 transition-all duration-300 text-xs sm:text-sm"
                        >
                          Nos Offres →
                        </motion.button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* PANEL 3: Impact Dashboard - Emerald Gradient */}
            <div
              className="panel h-[100dvh] flex-shrink-0 relative overflow-clip"
              style={{
                flexBasis: "100%",
                width: "100%",
                maxWidth: "100vw",
                touchAction: "pan-y",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(134,239,172,0.4)_0%,_transparent_60%),radial-gradient(ellipse_at_bottom_left,_rgba(110,231,183,0.4)_0%,_transparent_60%)]" />
              <div className="relative z-10 w-full h-full flex items-start sm:items-center justify-center pt-20 sm:pt-0 px-3 sm:px-4 lg:p-8">
                <div className="max-w-[95vw] w-full flex flex-col items-center justify-center max-h-full">
                  <div className="text-center mb-[1vw]">
                    <h2
                      className="gold-text mb-1 sm:mb-2 md:mb-3"
                      data-text="Tableau d'impact"
                    >
                      <span
                        className="gold-text__shine"
                        data-text="Tableau d'impact"
                      >
                        Tableau d'impact
                      </span>
                    </h2>
                    <div
                      className="hidden sm:inline-block"
                      style={{
                        animation: "panelIconWiggle 3s ease-in-out infinite",
                      }}
                    >
                      <TrendingUp className="w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 mx-auto mb-2 md:mb-4 text-white" />
                    </div>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-1 sm:mb-2 md:mb-4 text-center max-w-2xl mx-auto px-2">
                      Suivez notre impact collectif sur les communautés
                      artisanales à travers {countryMeta.nameFr}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-6 w-full max-w-[95vw] mb-2 sm:mb-3 md:mb-6">
                    {/* Left card: Community Growth */}
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/15 rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer group"
                    >
                      <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-1 sm:gap-2">
                        <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:text-emerald-300 transition-colors" />
                        Croissance communautaire
                      </h3>
                      <div className="space-y-1 sm:space-y-2">
                        {[
                          {
                            stat:
                              homeStats.artisanCount > 0
                                ? `${homeStats.artisanCount}+`
                                : "—",
                            label: "artisans soutenus",
                          },
                          {
                            stat:
                              homeStats.businessCount > 0
                                ? `${homeStats.businessCount}+`
                                : "—",
                            label: "entreprises enregistrées",
                          },
                          {
                            stat:
                              homeStats.categoryCount > 0
                                ? `${homeStats.categoryCount}`
                                : "—",
                            label: "catégories d'industrie",
                          },
                          { stat: "98%", label: "programmes actifs" },
                          { stat: "95%", label: "formation professionnelle" },
                          { stat: "87%", label: "événements culturels" },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-300 rounded-full flex-shrink-0"></div>
                            <span className="text-white/90 text-xs sm:text-sm">
                              <span className="font-bold text-emerald-300">
                                {item.stat}
                              </span>{" "}
                              {item.label}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Right card: Country Overview */}
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/15 rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer"
                    >
                      <div className="text-center mb-1 sm:mb-2">
                        <Globe
                          className="mx-auto mb-0.5 sm:mb-1 text-white"
                          size={14}
                        />
                        <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white">
                          Aperçu de {countryMeta.name}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
                        {[
                          {
                            icon: Building2,
                            label: "Entreprises",
                            value: homeStats.businessCount,
                          },
                          {
                            icon: Users,
                            label: "Artisans",
                            value: homeStats.artisanCount,
                          },
                          {
                            icon: Target,
                            label: "Catégories",
                            value: homeStats.categoryCount,
                          },
                          {
                            icon: MapPin,
                            label: countryMeta.name,
                            value: countryMeta.flag,
                          },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center p-1.5 sm:p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all cursor-pointer"
                          >
                            <item.icon
                              className="mx-auto mb-0.5 sm:mb-1 text-emerald-300"
                              size={16}
                            />
                            <span className="text-white text-[10px] sm:text-xs md:text-sm font-semibold block">
                              {item.label}
                            </span>
                            <span className="text-emerald-300 font-bold text-xs sm:text-sm md:text-base">
                              {item.value}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                      <Link to="/impact">
                        <button className="w-full bg-gradient-to-r from-emerald-400 to-emerald-300 text-emerald-900 py-1.5 sm:py-2 rounded-lg font-bold hover:from-white hover:to-emerald-100 transition-all duration-300 text-[10px] sm:text-xs md:text-sm shadow-lg hover:shadow-xl transform hover:scale-105">
                          <TrendingUp
                            size={14}
                            className="inline mr-1 sm:mr-2"
                          />
                          Voir le rapport complet
                        </button>
                      </Link>
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-white/20 to-emerald-100/20 rounded-xl p-2 sm:p-3 md:p-6 text-center border border-white/20 w-full max-w-2xl hover:border-white/40 transition-all cursor-pointer group"
                  >
                    <h3
                      className="text-base sm:text-xl md:text-3xl font-bold text-white mb-1 group-hover:text-emerald-200 transition-colors"
                      style={{ fontFamily: "'Alegreya', Georgia, serif" }}
                    >
                      Voir notre impact en action
                    </h3>
                    <p className="text-white/90 mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">
                      Suivez les progrès en temps réel et la transformation
                      communautaire
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/impact">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-white text-emerald-700 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-emerald-50 transition-all duration-300 text-xs sm:text-sm shadow-md hover:shadow-lg"
                        >
                          Voir l'impact
                        </motion.button>
                      </Link>
                      <Link to="/impact">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="border-2 border-white text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-white/10 transition-all duration-300 text-xs sm:text-sm"
                        >
                          Rapport complet
                        </motion.button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* PANEL 4: Get Involved - Teal Gradient */}
            <div
              className="panel h-[100dvh] flex-shrink-0 relative overflow-clip"
              style={{
                flexBasis: "100%",
                width: "100%",
                maxWidth: "100vw",
                touchAction: "pan-y",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(103,232,249,0.4)_0%,_transparent_60%),radial-gradient(ellipse_at_bottom_left,_rgba(94,234,212,0.4)_0%,_transparent_60%)]" />
              <div className="relative z-10 w-full h-full flex items-start sm:items-center justify-center pt-20 sm:pt-0 px-3 sm:px-4 lg:p-8">
                <div className="max-w-[95vw] w-full flex flex-col items-center justify-center max-h-full">
                  <div className="text-center mb-[1vw]">
                    <h2
                      className="gold-text mb-1 sm:mb-2 md:mb-3"
                      data-text="S'impliquer"
                    >
                      <span
                        className="gold-text__shine"
                        data-text="S'impliquer"
                      >
                        S'impliquer
                      </span>
                    </h2>
                    <div
                      className="hidden sm:inline-block"
                      style={{
                        animation: "panelIconPulse 2s ease-in-out infinite",
                      }}
                    >
                      <Handshake className="w-8 h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 mx-auto mb-2 md:mb-4 text-white" />
                    </div>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-1 sm:mb-2 md:mb-4 text-center max-w-2xl mx-auto px-2">
                      Rejoignez notre mouvement pour soutenir les artisans et
                      transformer les communautés à travers {countryMeta.nameFr}
                      .
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-6 w-full max-w-[95vw] mb-2 sm:mb-3 md:mb-6">
                    {/* Left card: Ways to Help */}
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/15 rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer group"
                    >
                      <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-1 sm:gap-2">
                        <Heart className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:text-teal-300 transition-colors" />
                        Comment aider
                      </h3>
                      <div className="space-y-1 sm:space-y-2">
                        {[
                          { stat: "245+", label: "bénévoles actifs" },
                          {
                            stat: "$125K+",
                            label: "récoltés pour les communautés",
                          },
                          { stat: "50+", label: "organisations partenaires" },
                          {
                            stat: "Cultural",
                            label: "programmes du patrimoine",
                          },
                          { stat: "Skill", label: "initiatives de formation" },
                          { stat: "Global", label: "réseau d'impact" },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-teal-300 rounded-full flex-shrink-0"></div>
                            <span className="text-white/90 text-xs sm:text-sm">
                              <span className="font-bold text-teal-300">
                                {item.stat}
                              </span>{" "}
                              {item.label}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Right card: Take Action */}
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/15 rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer"
                    >
                      <div className="text-center mb-1 sm:mb-2">
                        <Handshake
                          className="mx-auto mb-0.5 sm:mb-1 text-white"
                          size={14}
                        />
                        <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white">
                          Agir
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
                        {[
                          { icon: Users, label: "Bénévolat" },
                          { icon: Heart, label: "Faire un don" },
                          { icon: Handshake, label: "Partenaire" },
                          { icon: Globe, label: "Faire connaître" },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="text-center p-1.5 sm:p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all cursor-pointer"
                          >
                            <item.icon
                              className="mx-auto mb-0.5 sm:mb-1 text-teal-300"
                              size={16}
                            />
                            <span className="text-white text-[10px] sm:text-xs md:text-sm font-semibold">
                              {item.label}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                      <Link to="/get-involved">
                        <button className="w-full bg-gradient-to-r from-teal-400 to-teal-300 text-teal-900 py-1.5 sm:py-2 rounded-lg font-bold hover:from-white hover:to-teal-100 transition-all duration-300 text-[10px] sm:text-xs md:text-sm shadow-lg hover:shadow-xl transform hover:scale-105">
                          <Handshake
                            size={14}
                            className="inline mr-1 sm:mr-2"
                          />
                          Commencer
                        </button>
                      </Link>
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-white/20 to-teal-100/20 rounded-xl p-2 sm:p-3 md:p-6 text-center border border-white/20 w-full max-w-2xl hover:border-white/40 transition-all cursor-pointer group"
                  >
                    <h3
                      className="text-base sm:text-xl md:text-3xl font-bold text-white mb-1 group-hover:text-teal-200 transition-colors"
                      style={{ fontFamily: "'Alegreya', Georgia, serif" }}
                    >
                      Transformer des vies par l'art
                    </h3>
                    <p className="text-white/90 mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">
                      Votre soutien crée un changement durable dans les
                      communautés artisanales
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/get-involved">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-white text-teal-700 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-teal-50 transition-all duration-300 text-xs sm:text-sm shadow-md hover:shadow-lg"
                        >
                          Commencez à faire la différence
                        </motion.button>
                      </Link>
                      <Link to="/artihuman-foundation">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="border-2 border-white text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-white/10 transition-all duration-300 text-xs sm:text-sm"
                        >
                          Nous soutenir
                        </motion.button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Artisans Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <span className="text-emerald-400 font-semibold text-sm md:text-lg mb-2 block">
              Rencontrez nos artisans
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
              Artisans en vedette
            </h2>
            <p className="text-base md:text-xl text-gray-400 max-w-3xl mx-auto px-4">
              Rencontrez quelques-uns des artisans talentueux que nous soutenons
              à travers {countryMeta.nameFr}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {(homeStats.featuredArtisans.length > 0
              ? homeStats.featuredArtisans.map((a: any) => {
                  const initials = (a.name || "??")
                    .split(/\s+/)
                    .map((w: string) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return {
                    name: a.name || "Artiste inconnu",
                    role: a.genre || "Artisan",
                    specialty: a.genre || "Artisanat",
                    image: initials,
                    location: countryMeta.name,
                    rating: 4.9,
                    color: [
                      "from-indigo-500 to-purple-600",
                      "from-amber-500 to-orange-600",
                      "from-emerald-500 to-teal-600",
                    ][homeStats.featuredArtisans.indexOf(a) % 3],
                  };
                })
              : [
                  {
                    name: "Artisan en vedette",
                    role: "Tisserand",
                    specialty: "Textiles traditionnels",
                    image: "FA",
                    location: countryMeta.name,
                    rating: 4.9,
                    color: "from-indigo-500 to-purple-600",
                  },
                  {
                    name: "Artisan en vedette",
                    role: "Sculpteur sur bois",
                    specialty: "Sculptures traditionnelles",
                    image: "FA",
                    location: countryMeta.name,
                    rating: 4.8,
                    color: "from-amber-500 to-orange-600",
                  },
                  {
                    name: "Artisan en vedette",
                    role: "Artiste potier",
                    specialty: "Poterie traditionnelle",
                    image: "FA",
                    location: countryMeta.name,
                    rating: 4.9,
                    color: "from-emerald-500 to-teal-600",
                  },
                ]
            ).map((artisan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl md:rounded-3xl overflow-hidden border border-slate-700/50 hover:border-emerald-500/60 transition-all shadow-lg hover:shadow-2xl hover:shadow-emerald-500/10 group"
              >
                <div
                  className={`bg-gradient-to-r ${artisan.color} p-4 md:p-6 flex items-center gap-3 md:gap-4`}
                >
                  <div className="w-14 h-14 md:w-20 md:h-20 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center text-white text-xl md:text-2xl font-bold border border-white/30 shadow-inner">
                    {artisan.image}
                  </div>
                  <div>
                    <h3 className="text-base md:text-xl font-bold text-white">
                      {artisan.name}
                    </h3>
                    <p className="text-white/80 font-medium text-sm md:text-base">
                      {artisan.role}
                    </p>
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                    <div className="flex items-center gap-2 text-gray-300 text-sm md:text-base">
                      <Palette className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                      <span>{artisan.specialty}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 text-sm md:text-base">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 text-emerald-400" />
                      <span>{artisan.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm md:text-base">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Star
                            key={j}
                            className={`w-3 h-3 md:w-4 md:h-4 ${j < Math.floor(artisan.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
                          />
                        ))}
                      </div>
                      <span className="text-gray-300 font-semibold">
                        {artisan.rating}
                      </span>
                    </div>
                  </div>
                  <Link to="/artisans">
                    <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-2 md:py-3 rounded-lg md:rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base group-hover:shadow-lg group-hover:shadow-emerald-500/30">
                      <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                      Voir le profil
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Annuaire Musicale - Artist Directory Section */}
      <ShowcaseToggle
        label="Annuaire Musicale"
        icon={<Music className="w-5 h-5" />}
        isOpen={!!expandedSections["annuaire"]}
        onToggle={() => toggleSection("annuaire")}
        gradient="bg-gradient-to-r from-purple-800 to-purple-900"
      >
        <section className="py-12 md:py-20 bg-gradient-to-b from-slate-900 via-purple-900/60 to-slate-900 relative overflow-hidden">
          <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Header */}
            <div className="text-center mb-8 md:mb-16">
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-purple-400 font-semibold text-sm md:text-lg mb-2 inline-flex items-center justify-center gap-2"
              >
                <Music className="w-5 h-5" />
                Annuaire Musicale
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4"
              >
                Répertoire Complet des Artistes
              </motion.h2>
              <p className="text-base md:text-xl text-purple-200 max-w-3xl mx-auto px-4">
                Explorez plus de {artistAnnuaireGenres.length} catégories
                d'artistes à travers {countryMeta.nameFr}
              </p>
            </div>

            {/* Search Card */}
            <Card className="bg-gradient-to-br from-slate-800/90 to-purple-900/90 border-purple-700 shadow-2xl mb-12">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <Input
                      type="text"
                      value={artistAnnuaireQuery}
                      onChange={(e) => setArtistAnnuaireQuery(e.target.value)}
                      placeholder="Recherchez des artistes..."
                      className="pl-12 bg-slate-800/50 border-purple-600 text-white placeholder-purple-300/60"
                    />
                  </div>

                  {isArtistAnnuaireSearching && (
                    <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                  )}
                </div>

                {/* Genre & Country Filters */}
                <div className="pt-4 border-t border-purple-700 flex flex-col md:flex-row gap-4">
                  {/* Genre Dropdown */}
                  <div className="flex-1">
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      Genre ({artistAnnuaireGenres.length} disponibles)
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-purple-600 bg-slate-800 hover:bg-slate-700 w-full md:w-[300px] justify-between"
                        >
                          <span className="text-sm">
                            {selectedArtistGenre || "Tous les genres"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[300px] max-h-[400px] overflow-y-auto">
                        <DropdownMenuItem
                          onClick={() => setSelectedArtistGenre("")}
                        >
                          <span
                            className={
                              !selectedArtistGenre
                                ? "font-semibold text-purple-300"
                                : "text-purple-200"
                            }
                          >
                            Tous les genres
                          </span>
                        </DropdownMenuItem>
                        {artistAnnuaireGenres.map((genre) => (
                          <DropdownMenuItem
                            key={genre}
                            onClick={() => setSelectedArtistGenre(genre)}
                          >
                            {selectedArtistGenre === genre && (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            <span
                              className={
                                selectedArtistGenre === genre
                                  ? "font-semibold text-purple-300"
                                  : "text-purple-200"
                              }
                            >
                              🎵 {genre}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Country Dropdown */}
                  <div className="flex-1">
                    <Label className="text-sm font-medium mb-2 block text-purple-300">
                      Pays ({artistAnnuaireCountries.length} disponibles)
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-purple-600 bg-slate-800 hover:bg-slate-700 w-full md:w-[300px] justify-between"
                        >
                          <span className="text-sm">
                            {selectedArtistCountry
                              ? `${getCountryMeta(selectedArtistCountry).flag} ${getCountryMeta(selectedArtistCountry).name}`
                              : "Tous les pays"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-800 border-purple-600 w-[300px] max-h-[400px] overflow-y-auto">
                        <DropdownMenuItem
                          onClick={() => setSelectedArtistCountry("")}
                        >
                          <span
                            className={
                              !selectedArtistCountry
                                ? "font-semibold text-purple-300"
                                : "text-purple-200"
                            }
                          >
                            🌍 Tous les pays
                          </span>
                        </DropdownMenuItem>
                        {artistAnnuaireCountries.map((code) => {
                          const meta = getCountryMeta(code);
                          return (
                            <DropdownMenuItem
                              key={code}
                              onClick={() => setSelectedArtistCountry(code)}
                            >
                              {selectedArtistCountry === code && (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              <span
                                className={
                                  selectedArtistCountry === code
                                    ? "font-semibold text-purple-300"
                                    : "text-purple-200"
                                }
                              >
                                {meta.flag} {meta.name}
                              </span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Artist Results */}
            {artistAnnuaireHasSearched ? (
              <>
                {artistAnnuaireResults.length > 0 ? (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <Music className="h-6 w-6 text-purple-400" />
                        <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                          Artistes trouvés ({artistAnnuaireResults.length} sur{" "}
                          {artistAnnuaireTotalResults})
                        </span>
                      </h3>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <AnimatePresence>
                        {artistAnnuaireResults.map(
                          (artist: any, index: number) => {
                            const name = artist?.name || "Artiste inconnu";
                            const genre = artist?.genre || "Divers";
                            const initials = name
                              .split(/\s+/)
                              .filter(Boolean)
                              .map((w: string) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();
                            return (
                              <motion.div
                                key={artist.id || index}
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 border border-gray-700 hover:border-purple-500/40 cursor-pointer group"
                              >
                                <div className="h-2 bg-gradient-to-r from-purple-600 to-fuchsia-600" />
                                {/* Avatar */}
                                <div className="relative h-40 bg-gradient-to-br from-purple-800/40 to-slate-800 overflow-hidden flex items-center justify-center">
                                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                                    {initials}
                                  </div>
                                  <div className="absolute top-3 right-3">
                                    <Badge className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border-0 shadow-lg text-xs">
                                      🎵 {genre}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="p-5">
                                  <h4 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mb-2 line-clamp-1">
                                    {name}
                                  </h4>
                                  <div className="flex items-center justify-between text-sm">
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-purple-500/40 text-purple-300"
                                    >
                                      {artist.label_status === "signed"
                                        ? "🏷️ Signé"
                                        : artist.label_status === "independent"
                                          ? "🎯 Indépendant"
                                          : "🆓 Non signé"}
                                    </Badge>
                                    <Link
                                      href={`/artist-catalogue/${artist.id}`}
                                      onClick={(e: any) => e.stopPropagation()}
                                      className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors text-xs"
                                    >
                                      <Music className="h-3.5 w-3.5" />
                                      Écouter
                                    </Link>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          },
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">
                      Aucun artiste trouvé
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Essayez un autre nom ou genre
                    </p>
                    <Button
                      onClick={clearArtistAnnuaireFilters}
                      className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700"
                    >
                      Réinitialiser les filtres
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Music className="h-16 w-16 mx-auto text-purple-400/50 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Explorez l'annuaire musicale
                </h3>
                <p className="text-gray-400">
                  Sélectionnez un genre ou lancez votre recherche
                </p>
              </div>
            )}

            {/* CTA — Voir tous les artistes */}
            <div className="text-center mt-10">
              <Link to="/artistes">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold hover:from-purple-600 hover:to-fuchsia-600 transition-all inline-flex items-center gap-2 shadow-xl"
                >
                  <Music className="w-5 h-5" />
                  Voir tous les artistes
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </div>
        </section>
      </ShowcaseToggle>

      {/* Verso Air Music Artists Section */}
      <ShowcaseToggle
        label="Verso Air Music Label"
        icon={<Disc3 className="w-5 h-5" />}
        isOpen={!!expandedSections["music"]}
        onToggle={() => toggleSection("music")}
        gradient="bg-gradient-to-r from-indigo-800 to-purple-900"
      >
        <section className="py-12 md:py-20 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-20" />

          <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-8 md:mb-16">
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-purple-400 font-semibold text-sm md:text-lg mb-2 inline-flex items-center justify-center gap-2"
              >
                <Music className="w-5 h-5" />
                <span className="notranslate">Verso Air ™️ Music Label</span>
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4"
              >
                Artistes inscrits par pays
              </motion.h2>
              <p className="text-base md:text-xl text-purple-200 max-w-3xl mx-auto px-4">
                Découvrez des artistes talentueux signés chez{" "}
                <span className="notranslate">Verso Air</span> à travers le
                monde
              </p>
            </div>

            <ArtistCarouselByCountry />

            <div className="text-center mt-8 md:mt-12">
              <Link to="/artist-portal">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold hover:from-purple-600 hover:to-pink-600 transition-all inline-flex items-center gap-2 shadow-xl"
                >
                  <Music className="w-5 h-5" />
                  Visiter le portail artiste
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </div>
        </section>
      </ShowcaseToggle>

      {/* Partners & Sponsors Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-emerald-600 font-semibold text-sm md:text-lg mb-2 block"
            >
              Nos soutiens
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4"
            >
              Partenaires & Sponsors
            </motion.h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Organisations soutenant les communautés artisanales à travers{" "}
              {countryMeta.name}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-8">
            {[
              { name: "UNESCO", href: "/partners" },
              { name: "World Bank", href: "/partners" },
              { name: "African Union", href: "/partners" },
              { name: "Cultural Heritage", href: "/partners" },
              { name: "Artisan Alliance", href: "/partners" },
              { name: "Global Crafts", href: "/partners" },
            ].map((partner, i) => (
              <Link key={i} to={partner.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.08, y: -6 }}
                  className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-lg md:rounded-2xl p-3 md:p-6 text-center border border-gray-200 hover:border-emerald-500 hover:shadow-lg md:hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-lg md:rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md md:shadow-lg">
                    <Building2 className="w-5 h-5 md:w-8 md:h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-xs md:text-sm">
                    {partner.name}
                  </h4>
                </motion.div>
              </Link>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center mt-8 md:mt-12"
          >
            <Link to="/partners">
              <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl px-6 py-3">
                Voir tous les partenaires
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/sponsor">
              <Button
                variant="outline"
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-bold rounded-xl px-6 py-3"
              >
                Devenir sponsor
                <Handshake className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      <section className="py-12 md:py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-emerald-600 font-semibold text-sm md:text-lg mb-2 block"
            >
              Devenez bénévole
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4"
            >
              Faites la différence
            </motion.h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Rejoignez nos programmes de bénévolat et aidez à transformer les
              communautés artisanales
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {[
              {
                title: "Mentorat artistique",
                desc: "Guidez les artisans en herbe dans le développement de leur art",
                icon: Palette,
                volunteers: 85,
                capacity: 100,
                color: "from-violet-600 to-indigo-700",
                tag: "Créatif",
              },
              {
                title: "Action communautaire",
                desc: "Travaillez directement avec les communautés locales sur des programmes culturels",
                icon: Users,
                volunteers: 120,
                capacity: 150,
                color: "from-emerald-600 to-teal-700",
                tag: "Terrain",
              },
              {
                title: "Développement des compétences",
                desc: "Enseignez les compétences commerciales et techniques aux artisans",
                icon: Briefcase,
                volunteers: 95,
                capacity: 120,
                color: "from-amber-500 to-orange-600",
                tag: "Formation",
              },
            ].map((opportunity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white rounded-xl md:rounded-3xl shadow-lg md:shadow-xl border border-gray-200 overflow-hidden hover:shadow-xl md:hover:shadow-2xl transition-all group"
              >
                <div
                  className={`bg-gradient-to-r ${opportunity.color} p-4 md:p-6 text-white relative overflow-hidden`}
                >
                  <div className="absolute top-3 right-3 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                    {opportunity.tag}
                  </div>
                  <opportunity.icon className="w-8 h-8 md:w-12 md:h-12 mb-3 md:mb-4 opacity-90" />
                  <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-2">
                    {opportunity.title}
                  </h3>
                  <p className="text-white/90 text-xs md:text-sm">
                    {opportunity.desc}
                  </p>
                </div>
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 font-medium text-sm md:text-base">
                      Bénévoles actifs
                    </span>
                    <span className="text-xl md:text-2xl font-bold text-emerald-600">
                      {opportunity.volunteers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                      style={{
                        width: `${(opportunity.volunteers / opportunity.capacity) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mb-4">
                    {opportunity.volunteers}/{opportunity.capacity} places
                    pourvues
                  </p>
                  <Link to="/get-involved">
                    <button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2 md:py-3 rounded-lg md:rounded-xl font-bold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md md:shadow-lg text-sm md:text-base group-hover:shadow-emerald-500/30">
                      Postuler
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ResponsiveFooter countryMeta={countryMeta} />

      <AnimatePresence>
        {showCookieConsent && (
          <CookieConsentBanner
            onAccept={handleCookieAccept}
            onDecline={handleCookieDecline}
          />
        )}
      </AnimatePresence>
      <CulturalProgramsModal
        isOpen={isCulturalModalOpen}
        onClose={() => setIsCulturalModalOpen(false)}
      />
      <ScrollToTop />
    </div>
  );
}

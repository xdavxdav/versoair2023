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

  @media (max-width: 768px) {
    .gold-text {
      font-size: 2.5rem;
    }
  }

  @media (max-width: 640px) {
    .gold-text {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 380px) {
    .gold-text {
      font-size: 1.25rem;
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
        tags: business.tags || [],
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
    const response = await fetch(
      `${API_BASE_URL}/api/business/test-connection`,
    );
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
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

// Cultural Programs Modal
type CulturalProgramsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const CulturalProgramsModal = ({
  isOpen,
  onClose,
}: CulturalProgramsModalProps) => {
  useScrollLock(isOpen);

  const programs = [
    {
      id: "agriculture",
      title: "Agricultural Arts",
      desc: "Connecting Farming and Creativity",
      icon: Trees,
      details:
        "Our agricultural arts program brings together local farmers and artists to create installations and events.",
      list: [
        "Farm-to-Table Theater",
        "Harvest Festivals",
        "Agricultural Sculpture Garden",
        "Community Workshops",
        "Rural Artist Residency",
      ],
    },
    {
      id: "music",
      title: "Music",
      desc: "Elevating Local Musical Talent",
      icon: Music,
      details:
        "We provide platforms for emerging musicians and performers to showcase their talents.",
      list: [
        "Monthly Concert Series",
        "Music Education Programs",
        "International Collaborations",
        "Recording Studio Access",
        "Annual Music Festival",
      ],
    },
    {
      id: "urban",
      title: "Urban Art",
      desc: "Beautifying Urban Spaces",
      icon: Palette,
      details:
        "Our urban art initiatives transform neglected spaces into vibrant community assets.",
      list: [
        "Public Mural Projects",
        "Street Art Installations",
        "Graffiti-to-Gallery Development",
        "Community Art Walks",
        "Urban Artisan Markets",
      ],
    },
    {
      id: "community",
      title: "Community Programs",
      desc: "Empowering Voices Through Community Engagement",
      icon: Users,
      details:
        "Our community programs provide a platform for local stories and cultural preservation.",
      list: [
        "Theater Workshops",
        "Original Community Plays",
        "Youth Programs",
        "Multilingual Performances",
        "Traveling Theater Troupe",
      ],
    },
  ];

  const [selectedProgram, setSelectedProgram] = useState(programs[0]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ overscrollBehavior: "contain" }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ overscrollBehavior: "contain" }}
          >
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 md:p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-3xl font-bold">
                  Our Cultural Programs
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-emerald-100 mt-2 text-sm md:text-base">
                Discover how we're transforming communities through art and
                culture
              </p>
            </div>
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 bg-gray-50 p-4 md:p-6 border-r border-gray-200">
                <div className="space-y-2 md:space-y-3">
                  {programs.map((program) => (
                    <button
                      key={program.id}
                      onClick={() => setSelectedProgram(program)}
                      className={`w-full text-left p-3 md:p-4 rounded-xl transition-all duration-200 ${
                        selectedProgram.id === program.id
                          ? "bg-white shadow-lg border-2 border-emerald-500 scale-105"
                          : "bg-gray-100 hover:bg-white hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <program.icon
                          size={18}
                          className={
                            selectedProgram.id === program.id
                              ? "text-emerald-600"
                              : "text-gray-600"
                          }
                        />
                        <span
                          className={`font-semibold text-sm md:text-base ${
                            selectedProgram.id === program.id
                              ? "text-emerald-700"
                              : "text-gray-700"
                          }`}
                        >
                          {program.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:w-2/3 p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <selectedProgram.icon
                    size={20}
                    className="text-emerald-600"
                  />
                  <div>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-800">
                      {selectedProgram.title}
                    </h3>
                    <p className="text-gray-600 text-sm md:text-base">
                      {selectedProgram.desc}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 md:mb-6 leading-relaxed text-sm md:text-base">
                  {selectedProgram.details}
                </p>
                <div className="bg-emerald-50 rounded-xl p-4 md:p-6">
                  <h4 className="font-semibold text-emerald-800 mb-3 md:mb-4 text-base md:text-lg">
                    Program Highlights:
                  </h4>
                  <div className="space-y-2 md:space-y-3">
                    {selectedProgram.list.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 text-gray-700 text-sm md:text-base"
                      >
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 md:mt-6 flex flex-col sm:flex-row gap-3">
                  <Link to="/ong-culturelle">
                    <button className="bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors text-sm md:text-base">
                      Learn More
                    </button>
                  </Link>
                  <Link to="/get-involved">
                    <button className="border border-emerald-600 text-emerald-600 px-4 md:px-6 py-2 rounded-lg font-semibold hover:bg-emerald-50 transition-colors text-sm md:text-base">
                      Get Involved
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Cookie Consent Component
type CookieConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
};

const CookieConsentBanner = ({
  onAccept,
  onDecline,
}: CookieConsentBannerProps) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 md:p-6 shadow-2xl border-t border-blue-500/30 z-[9999]"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3 md:gap-4">
          <Cookie className="w-6 h-6 md:w-8 md:h-8 text-blue-400 flex-shrink-0" />
          <div>
            <h3 className="font-bold mb-1 md:mb-2 text-base md:text-lg">
              🍪 Cookie Preferences
            </h3>
            <p className="text-xs md:text-sm text-gray-300">
              We use cookies to enhance your experience and analyze site
              performance.
            </p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-3 flex-shrink-0">
          <button
            onClick={onDecline}
            className="px-4 md:px-6 py-2 border border-gray-400 rounded-lg hover:bg-gray-800/50 transition-colors text-xs md:text-sm font-medium"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 md:px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all text-xs md:text-sm font-bold shadow-lg"
          >
            Accept All
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Magnetic Input Component
type MagneticInputProps = {
  children: React.ReactNode;
  className?: string;
};

const MagneticInput = ({ children, className }: MagneticInputProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent) => {
    if (!ref.current) return;
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
  };

  const handleMouseLeave = () => setTransform({ x: 0, y: 0 });

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={ref}
      animate={{ x: transform.x, y: transform.y }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Responsive Footer Component
const ResponsiveFooter = ({
  countryMeta,
}: {
  countryMeta: ReturnType<typeof getCountryMeta>;
}) => {
  const { isAuthenticated } = useSubscription();
  return (
    <footer className="bg-slate-900 text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AH</span>
              </div>
              <span className="font-bold text-xl">ArtiHuman Foundation</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Empowering artisans and uplifting communities through humanitarian
              innovation across {countryMeta.name}.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white text-sm">
                  Home
                </Link>
              </li>
              <li>
                {isAuthenticated ? (
                  <Link
                    to="/geo-admin"
                    className="text-gray-400 hover:text-emerald-400 text-sm flex items-center gap-2"
                  >
                    <Database size={16} />
                    Geo Admin
                  </Link>
                ) : (
                  <Link
                    to="/geo-admin"
                    className="text-gray-600 text-sm flex items-center gap-2 cursor-pointer group"
                  >
                    <Lock size={14} className="text-gray-600" />
                    <span className="text-gray-600">Geo Admin</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      Sign in
                    </span>
                  </Link>
                )}
              </li>
              <li>
                <Link
                  to="/programs"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Cultural Programs
                </Link>
              </li>
              <li>
                <Link
                  to="/commerce"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Phone size={16} />
                <span>{countryMeta.phone}</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <Mail size={16} />
                <span>contact@artihuman{countryMeta.tld}</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-sm">
                <GlobeIcon size={16} />
                <span>
                  {countryMeta.flag} {countryMeta.name}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Newsletter</h3>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe to get updates on our programs and impact.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2 rounded-l-lg bg-slate-800 text-white text-sm focus:outline-none"
              />
              <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 rounded-r-lg text-sm font-medium">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>© 2024 ArtiHuman Foundation. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Filter options
const categoryOptions: FilterOption[] = [
  { value: "technology", label: "Technology" },
  { value: "retail", label: "Retail" },
  { value: "service", label: "Service" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "hospitality", label: "Hospitality" },
  { value: "agriculture", label: "Agriculture" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
];

const locationOptions: FilterOption[] = [
  { value: "capital", label: "Capital City" },
  { value: "north", label: "Northern Region" },
  { value: "south", label: "Southern Region" },
  { value: "east", label: "Eastern Region" },
  { value: "west", label: "Western Region" },
  { value: "central", label: "Central Region" },
  { value: "coastal", label: "Coastal Area" },
  { value: "rural", label: "Rural Area" },
];

const rangeOptions: FilterOption[] = [
  { value: "near-me", label: "Near My Location" },
  { value: "5", label: "Within 5km" },
  { value: "10", label: "Within 10km" },
  { value: "25", label: "Within 25km" },
  { value: "50", label: "Within 50km" },
  { value: "any", label: "Any distance" },
];

// Music Artists Grid Component
function MusicArtistsGrid({ countryCode }: { countryCode?: string }) {
  const { data: artists, isLoading } = useMusicArtists(countryCode);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!artists || artists.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
        <p className="text-purple-200 text-lg">No artists registered yet</p>
        <p className="text-purple-300 text-sm mt-2">
          Check back soon for exciting new talent!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {artists.slice(0, 8).map((artist: any, i: number) => (
        <motion.div
          key={artist.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          viewport={{ once: true, margin: "-50px" }}
          whileHover={{ scale: 1.05, y: -5 }}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-400/50 transition-all cursor-pointer group"
        >
          <div className="flex flex-col items-center text-center">
            {(() => {
              const stageName = artist?.name?.trim() || "Unknown Artist";
              const initials = stageName
                .split(/\s+/)
                .filter(Boolean)
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const artistCountry = artist.country_code
                ? getCountryMeta(artist.country_code)
                : null;

              return (
                <>
                  {/* Artist Avatar */}
                  <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl group-hover:shadow-purple-500/50 transition-shadow relative">
                    {initials}
                    {artistCountry && (
                      <span
                        className="absolute -bottom-1 -right-1 text-lg"
                        title={artistCountry.name}
                      >
                        {artistCountry.flag}
                      </span>
                    )}
                  </div>

                  {/* Artist Name */}
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                    {stageName}
                  </h3>

                  {/* Genre + Country */}
                  <p className="text-purple-300 text-sm mb-3">
                    {artist.genre || "Artiste"}
                    {artistCountry
                      ? ` • ${artistCountry.flag} ${artistCountry.name}`
                      : ""}
                  </p>

                  {/* Label Status / Genre / Country */}
                  <div className="grid grid-cols-3 gap-3 w-full mt-3 pt-3 border-t border-white/10">
                    <div className="text-center">
                      <div className="text-sm font-bold text-white">
                        {artist.label_status === "signed"
                          ? "🏷️ Signé"
                          : artist.label_status === "independent"
                            ? "🎯 Indép."
                            : "🆓 Libre"}
                      </div>
                      <div className="text-xs text-purple-200">Label</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-white">
                        {artist.genre ? artist.genre.slice(0, 8) : "—"}
                      </div>
                      <div className="text-xs text-purple-200">Genre</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-white">
                        {artistCountry ? `${artistCountry.flag}` : "🌍"}
                      </div>
                      <div className="text-xs text-purple-200">
                        {artistCountry
                          ? artistCountry.name.slice(0, 10)
                          : "Global"}
                      </div>
                    </div>
                  </div>

                  {/* Spotify / View Button */}
                  {artist.spotify_url ? (
                    <a
                      href={artist.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-500 text-white py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-600 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-green-500/30"
                    >
                      <Play className="w-4 h-4" />
                      Écouter
                    </a>
                  ) : (
                    <Link to="/artistes" className="w-full">
                      <button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-purple-500/50">
                        <Music className="w-4 h-4" />
                        Voir le profil
                      </button>
                    </Link>
                  )}
                </>
              );
            })()}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

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

  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [totalDatabaseCount, setTotalDatabaseCount] = useState(0);
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(
    null,
  );

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

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedLocationQuery = useDebounce(locationQuery, 500);

  // Number of panels
  const NUM_PANELS = 4;

  // Load initial data from database
  const loadInitialData = async () => {
    try {
      const result = await getAllBusinesses();
      if (result.success && result.data.length > 0) {
        setSearchResults(result.data.slice(0, 5)); // Show first 5 businesses
        setTotalDatabaseCount(result.total);
        setHasSearched(true);
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  };

  // Test database connection on mount - DON'T load data until user searches
  useEffect(() => {
    const initializeDatabase = async () => {
      console.log("Testing database connection to port 5003...");
      const result = await testDatabaseConnection();
      // Only mark as disconnected if success is false AND connected is false
      // If success is true, always mark as connected
      const connected = result.success === true;
      setDatabaseConnected(connected);
      console.log(
        "Database connection result:",
        result,
        "Connected:",
        connected,
      );

      if (connected) {
        console.log(
          `✅ Connected to database: ${
            result.database || "versoair_business_intelligence"
          }`,
        );
        // Get total count without loading data
        try {
          const result = await getAllBusinesses();
          if (result.success) {
            setTotalDatabaseCount(result.total);
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
  }, []);

  // FIXED: Smooth zoom-out → slide → zoom-in effect
  useLayoutEffect(() => {
    if (!panelsWrapperRef.current || !panelsContainerRef.current) return;

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
        scale: 1,
        transformStyle: "preserve-3d",
        perspective: 1200,
      });

      // Get all panel elements
      const panels = gsap.utils.toArray<HTMLElement>(".panel");

      // Set initial states for all panels
      gsap.set(panels, {
        scale: 1,
        transformOrigin: "center center",
      });

      // Calculate animation stats
      const ZOOM_OUT_SCALE = 0.85; // Consistent zoom-out scale
      const ZOOM_IN_SCALE = 1; // Normal scale
      const ZOOM_DURATION = 0.8; // Duration for zoom animations
      const SLIDE_DURATION = 1.4; // Duration for slide animations
      const TOTAL_TRANSITION = ZOOM_DURATION * 2 + SLIDE_DURATION; // Total time per transition
      // Use percentage of container width for slides (container is NUM_PANELS * 100% wide)
      const SLIDE_STEP = `${-100 / NUM_PANELS}%`;

      // Create master timeline
      const masterTimeline = gsap.timeline({
        scrollTrigger: {
          id: "panels-scroll",
          trigger: panelsWrapperRef.current,
          pin: true,
          pinSpacing: true,
          scrub: 1.2, // Smoother scrubbing
          start: "top top",
          end: () => `+=${window.innerHeight * (NUM_PANELS - 1) * 1.2}`, // Adjusted for better timing
          invalidateOnRefresh: true,
          anticipatePin: 1,
          markers: false,
        },
      });

      // Panel 1 → Panel 2 transition
      masterTimeline
        // Zoom out current panel (Panel 1)
        .to(
          panels[0],
          {
            scale: ZOOM_OUT_SCALE,
            duration: ZOOM_DURATION,
            ease: "power2.inOut",
          },
          "start",
        )
        // Slide to next panel while zoomed out
        .to(
          panelsContainerRef.current,
          {
            x: SLIDE_STEP,
            duration: SLIDE_DURATION,
            ease: "power2.inOut",
          },
          `start+=${ZOOM_DURATION}`,
        )
        // Zoom in next panel (Panel 2)
        .to(
          panels[1],
          {
            scale: ZOOM_IN_SCALE,
            duration: ZOOM_DURATION,
            ease: "power2.inOut",
          },
          `start+=${ZOOM_DURATION + SLIDE_DURATION - 0.2}`,
        );

      // Panel 2 → Panel 3 transition
      masterTimeline
        .to(
          panels[1],
          {
            scale: ZOOM_OUT_SCALE,
            duration: ZOOM_DURATION,
            ease: "power2.inOut",
          },
          `start+=${TOTAL_TRANSITION}`,
        )
        .to(
          panelsContainerRef.current,
          {
            x: `${(-2 * 100) / NUM_PANELS}%`,
            duration: SLIDE_DURATION,
            ease: "power2.inOut",
          },
          `start+=${TOTAL_TRANSITION + ZOOM_DURATION}`,
        )
        .to(
          panels[2],
          {
            scale: ZOOM_IN_SCALE,
            duration: ZOOM_DURATION,
            ease: "power2.inOut",
          },
          `start+=${TOTAL_TRANSITION + ZOOM_DURATION + SLIDE_DURATION - 0.2}`,
        );

      // Panel 3 → Panel 4 transition
      masterTimeline
        .to(
          panels[2],
          {
            scale: ZOOM_OUT_SCALE,
            duration: ZOOM_DURATION,
            ease: "power2.inOut",
          },
          `start+=${TOTAL_TRANSITION * 2}`,
        )
        .to(
          panelsContainerRef.current,
          {
            x: `${(-3 * 100) / NUM_PANELS}%`,
            duration: SLIDE_DURATION,
            ease: "power2.inOut",
          },
          `start+=${TOTAL_TRANSITION * 2 + ZOOM_DURATION}`,
        )
        .to(
          panels[3],
          {
            scale: ZOOM_IN_SCALE,
            duration: ZOOM_DURATION,
            ease: "power2.inOut",
          },
          `start+=${
            TOTAL_TRANSITION * 2 + ZOOM_DURATION + SLIDE_DURATION - 0.2
          }`,
        );
    });

    // Refresh ScrollTrigger
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      ctx.revert();
      clearTimeout(refreshTimeout);
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
        // Set initial state explicitly
        gsap.set(cards, { y: 0, opacity: 1 });

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
      // If no search criteria, clear results - don't show cards
      setSearchResults([]);
      setHasSearched(false);
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

    window.addEventListener("scroll", handleScroll);
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

    // Reload initial data
    if (databaseConnected) {
      loadInitialData();
    }
  };

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
      const countryFilter = selectedArtistCountry || selectedCountry;
      if (countryFilter) params.set("countryCode", countryFilter);
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
    setArtistAnnuaireResults([]);
    setArtistAnnuaireHasSearched(false);
    setArtistAnnuaireTotalResults(0);
  };

  const scrollToHelpSection = () => {
    if (helpSectionRef.current) {
      helpSectionRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 relative overflow-x-clip">
      {/* Hero Section */}
      <div className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/80 via-emerald-700/80 to-emerald-800/80" />

        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{ y: [0, -100, 0], opacity: [0.2, 0.8, 0.2] }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center text-white max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4 md:mb-6"
          >
            <span className="px-3 py-1 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm rounded-full text-xs md:text-sm font-medium border border-white/20">
              🎨 Empowering Artisans in {countryMeta.name}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 drop-shadow-2xl px-4"
          >
            ArtiHuman Foundation
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl mb-4 text-white/90 px-4"
          >
            Empowering artisans and uplifting communities through humanitarian
            innovation across {countryMeta.name}
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
                    ? "✅ Connected to PostgreSQL"
                    : "❌ Database connection failed"}
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
                Get Involved
              </Button>
            </Link>
            <Link to="/ong-culturelle">
              <Button className="border-2 border-white text-white px-6 py-4 md:px-10 md:py-6 rounded-xl md:rounded-2xl font-bold hover:bg-white/10 transition-all text-base md:text-lg w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </motion.div>
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-8 md:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6">
              Discover Artisan Communities
            </h2>
            <p className="text-lg md:text-2xl text-gray-600 px-4 max-w-3xl mx-auto">
              Search our directory of artisan communities and cultural programs
              across {countryMeta.name}
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto mb-8 md:mb-12">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl md:rounded-[2rem] shadow-2xl p-4 md:p-6 border border-white/10">
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <MagneticInput className="flex-1">
                  <div className="relative bg-slate-800/90 rounded-2xl md:rounded-3xl border border-emerald-500/40 hover:border-emerald-400/60 transition-colors group">
                    <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-emerald-400 w-5 h-5 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search artisan communities, programs..."
                      className="w-full pl-12 md:pl-20 pr-6 md:pr-8 py-4 md:py-6 bg-transparent border-none focus:outline-none text-white placeholder-emerald-100/60 text-base md:text-xl font-medium rounded-2xl md:rounded-3xl"
                    />
                  </div>
                </MagneticInput>
                <MagneticInput className="flex-1">
                  <div className="relative bg-slate-800/90 rounded-2xl md:rounded-3xl border border-emerald-500/40 hover:border-emerald-400/60 transition-colors group">
                    <MapPin className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-emerald-400 w-5 h-5 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="Enter location..."
                      className="w-full pl-12 md:pl-20 pr-6 md:pr-8 py-4 md:py-6 bg-transparent border-none focus:outline-none text-white placeholder-emerald-100/60 text-base md:text-xl font-medium rounded-2xl md:rounded-3xl"
                    />
                  </div>
                </MagneticInput>
              </div>
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
                <span>Advanced Filter</span>
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
                  Clear all
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
                className="max-w-6xl mx-auto mb-8 md:mb-12 overflow-hidden"
              >
                <div className="bg-gradient-to-br from-white to-emerald-50 rounded-3xl md:rounded-[2rem] p-6 md:p-10 shadow-2xl border border-emerald-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {[
                      {
                        label: "Artisan Category",
                        options: categoryOptions,
                        type: "category",
                      },
                      {
                        label: "Program Type",
                        options: categoryOptions,
                        type: "program-type",
                      },
                      {
                        label: "Location",
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
                          <option value="">Select {section.label}</option>
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
                      {isGettingLocation ? "Getting..." : "My Location"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {locationError && (
            <div className="max-w-6xl mx-auto mb-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm md:text-base text-center">
              {locationError}
            </div>
          )}
          {userLocation && (
            <div className="max-w-6xl mx-auto mb-4 p-3 md:p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm md:text-base text-center">
              ✅ Location detected - Showing results near you
            </div>
          )}

          {/* CARDS SECTION - Fixed cards display */}
          <div className="max-w-7xl mx-auto" ref={cardsSectionRef}>
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
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full blur-xl opacity-50" />
                      <div className="relative w-20 h-20 md:w-28 md:h-28 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-full flex items-center justify-center shadow-2xl">
                        <Search className="h-10 w-10 md:h-14 md:w-14 text-white" />
                      </div>
                    </div>
                  </motion.div>
                  <h3 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent mb-3 md:mb-4">
                    Searching PostgreSQL Database...
                  </h3>
                  <p className="text-gray-600 mb-6 md:mb-8 text-base md:text-lg">
                    Querying artisan communities from
                    versoair_business_intelligence database
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
                      🎨 Artisan Community Results
                    </h3>
                    {databaseConnected === false && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full mt-2 md:mt-0">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">
                          Database Error
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-base md:text-xl">
                    Found{" "}
                    <span className="font-bold text-emerald-600">
                      {searchResults.length}
                    </span>{" "}
                    communities (max 5 shown)
                    {userLocation && (
                      <span className="text-green-600 font-semibold ml-2 md:ml-3">
                        • Sorted by distance
                      </span>
                    )}
                    {databaseConnected && (
                      <span className="text-blue-600 font-semibold ml-2 md:ml-3">
                        • From PostgreSQL Database
                      </span>
                    )}
                  </p>
                </motion.div>

                <div className="database-viewport relative overflow-hidden">
                  <div
                    className={`transition-all duration-300 ${
                      showAllResults
                        ? "max-h-[4000px]"
                        : "max-h-[650px] sm:max-h-[700px] lg:max-h-[600px]"
                    } overflow-hidden`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                      {searchResults
                        .slice(
                          0,
                          showAllResults
                            ? searchResults.length
                            : Math.min(5, searchResults.length),
                        )
                        .map((business, index) => (
                          <motion.div
                            key={business.id}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
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
                                  {business.distance.toFixed(1)}km away
                                </div>
                              )}

                              <p className="text-gray-700 text-sm md:text-base mb-6 md:mb-8 leading-relaxed line-clamp-2">
                                {business.description}
                              </p>

                              <div className="flex flex-wrap items-center justify-between pt-4 md:pt-6 border-t border-gray-100 gap-3">
                                <span className="px-3 md:px-5 py-1.5 md:py-2.5 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 rounded-full text-sm font-bold capitalize">
                                  {business.category}
                                </span>
                                {business.tags && business.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {business.tags.slice(0, 2).map((tag, i) => (
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
                                  <span>Details</span>
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
                    <Link to="/database-results">
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
                          <Database className="w-6 h-6 md:w-7 md:h-7 animate-pulse" />
                          <span className="text-lg md:text-xl font-bold">
                            View All Artisan Communities
                          </span>
                          <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform duration-300" />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full blur-md opacity-30 group-hover:opacity-70 transition-opacity duration-300"></div>
                      </motion.button>
                    </Link>

                    <p className="text-gray-600 mt-4 text-sm md:text-base">
                      Explore our complete database of {totalDatabaseCount}+
                      artisan communities
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
                    No Results Found
                  </h3>
                  <p className="text-gray-600 mb-8 md:mb-10 text-base md:text-lg">
                    No businesses match your search criteria in the database
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-2xl font-bold text-base md:text-lg shadow-xl"
                  >
                    Clear All & Start Over
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-6 mt-12 md:mt-16">
            {[
              {
                icon: User,
                text: "Artisan Profiles",
                desc: "Meet our artisans",
                href: "/artisans",
              },
              {
                icon: Palette,
                text: "Art & Crafts",
                desc: "Shop handmade creations",
                href: "/marketplace",
              },
              {
                icon: ShoppingBag,
                text: "Marketplace",
                desc: "Artisan storefront",
                href: "/marketplace",
              },
              {
                icon: Users,
                text: "Communities",
                desc: "Local groups",
                href: "/communities",
              },
              {
                icon: Heart,
                text: "Support Us",
                desc: "Fund & sponsor the mission",
                href: "/sponsorship",
              },
              {
                icon: Calendar,
                text: "Events",
                desc: "Workshops & shows",
                href: "/divertissement",
              },
            ].map((item, i) => (
              <Link key={i} to={item.href}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.05 }}
                  className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 text-center border border-gray-100 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                >
                  <item.icon className="w-8 h-8 md:w-10 md:h-10 text-emerald-600 mx-auto mb-3 md:mb-4" />
                  <p className="font-semibold text-gray-800 text-sm md:text-base">
                    {item.text}
                  </p>
                  <p className="text-gray-500 text-xs md:text-sm mt-2">
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
        className="panels-wrapper relative h-[100dvh] overflow-hidden"
        ref={panelsWrapperRef}
        style={{ overscrollBehavior: "contain" }}
      >
        <div
          className="h-[100dvh] w-full overflow-hidden"
          style={{
            overscrollBehavior: "contain",
            touchAction: "pan-y pinch-zoom",
          }}
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
              className="panel h-[100dvh] flex-shrink-0 relative overflow-hidden overscroll-contain"
              style={{ flexBasis: "100%", width: "100%", maxWidth: "100vw" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800" />
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-300 rounded-full blur-3xl"></div>
              </div>
              <div className="relative z-10 w-full h-full flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl w-full flex flex-col items-center justify-center max-h-full">
                  <div className="text-center mb-3 sm:mb-4 md:mb-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="inline-block"
                    >
                      <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 mx-auto mb-1 sm:mb-2 md:mb-4 text-white" />
                    </motion.div>
                    <h2
                      className="gold-text mb-1 sm:mb-2 md:mb-3"
                      data-text="ArtiHuman Foundation"
                    >
                      <span
                        className="gold-text__shine"
                        data-text="ArtiHuman Foundation"
                      >
                        ArtiHuman Foundation
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-1 sm:mb-2 md:mb-4 text-center max-w-2xl mx-auto px-2">
                      Empowering artisans and uplifting communities through
                      humanitarian innovation across {countryMeta.name}.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-6 w-full max-w-5xl mb-2 sm:mb-3 md:mb-6">
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer group"
                    >
                      <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white mb-1 sm:mb-2 flex items-center gap-1 sm:gap-2">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 group-hover:text-emerald-300 transition-colors" />
                        Our Impact in {countryMeta.name}:
                      </h3>
                      <div className="space-y-1 sm:space-y-2">
                        {[
                          {
                            stat:
                              homeStats.artisanCount > 0
                                ? `${homeStats.artisanCount}+`
                                : "—",
                            label: "artisans supported",
                            icon: "👥",
                          },
                          {
                            stat:
                              homeStats.businessCount > 0
                                ? `${homeStats.businessCount}+`
                                : "—",
                            label: "businesses registered",
                            icon: "❤️",
                          },
                          {
                            stat:
                              homeStats.categoryCount > 0
                                ? `${homeStats.categoryCount}`
                                : "—",
                            label: "industry categories",
                            icon: "🏢",
                          },
                          {
                            stat: "Cultural",
                            label: "heritage programs",
                            icon: "🎨",
                          },
                          {
                            stat: "Skill",
                            label: "development programs",
                            icon: "📚",
                          },
                          {
                            stat: "Ethical",
                            label: "local partnerships",
                            icon: "🤝",
                          },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
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
                      className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer"
                    >
                      <div className="text-center mb-1 sm:mb-2">
                        <Sparkles
                          className="mx-auto mb-0.5 sm:mb-1 text-white"
                          size={14}
                        />
                        <h3 className="text-xs sm:text-sm md:text-xl font-bold text-white">
                          Cultural Programs
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
                        {[
                          { icon: Trees, label: "Agricultural Arts" },
                          { icon: Music, label: "Music" },
                          { icon: Palette, label: "Urban Art" },
                          { icon: Users, label: "Community" },
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
                        Explore Programs
                      </button>
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-white/15 to-emerald-100/15 backdrop-blur-md rounded-xl p-2 sm:p-3 md:p-6 text-center border border-white/20 w-full max-w-2xl hover:border-white/40 transition-all cursor-pointer group"
                  >
                    <h3 className="text-sm sm:text-base md:text-xl font-bold text-white mb-1 group-hover:text-emerald-200 transition-colors">
                      Join Our Movement
                    </h3>
                    <p className="text-white/90 mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">
                      Be part of transforming communities through art, culture,
                      and humanitarian innovation
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/ong-culturelle">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-white text-emerald-700 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-emerald-50 transition-all duration-300 text-xs sm:text-sm shadow-md hover:shadow-lg"
                        >
                          Learn More
                        </motion.button>
                      </Link>
                      <Link to="/artihuman-foundation">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="border-2 border-white text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-white/10 transition-all duration-300 text-xs sm:text-sm"
                        >
                          Support Us
                        </motion.button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* PANEL 2: Artisan Marketplace - Amber Gradient */}
            <div
              className="panel h-[100dvh] flex-shrink-0 relative overflow-hidden overscroll-contain"
              style={{ flexBasis: "100%", width: "100%", maxWidth: "100vw" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700" />
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-orange-300 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-amber-300 rounded-full blur-3xl"></div>
              </div>
              <div className="relative z-10 w-full h-full flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl w-full flex flex-col items-center justify-center max-h-full">
                  <div className="text-center mb-3 sm:mb-4 md:mb-6">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-block"
                    >
                      <ShoppingBag className="w-5 h-5 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 mx-auto mb-1 sm:mb-2 md:mb-4 text-white" />
                    </motion.div>
                    <h2
                      className="gold-text mb-1 sm:mb-2 md:mb-3"
                      data-text="Artisan Marketplace"
                    >
                      <span
                        className="gold-text__shine"
                        data-text="Artisan Marketplace"
                      >
                        Artisan Marketplace
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-1 sm:mb-2 md:mb-4 text-center max-w-2xl mx-auto px-2">
                      Discover unique handcrafted products that support
                      communities and preserve traditional {countryMeta.demonym}{" "}
                      crafts.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-6 w-full max-w-5xl mb-2 sm:mb-3 md:mb-6">
                    {[
                      {
                        name: "Artisan Pottery Set",
                        type: "Traditional Ceramics",
                        price: `149.99 ${countryMeta.currencySymbol}`,
                        rating: 4.8,
                        emoji: "🏺",
                        gradient: "from-orange-400 to-amber-600",
                        badge: "Bestseller",
                        sold: "2.4K sold",
                      },
                      {
                        name: "Handwoven Textile Collection",
                        type: "Handwoven Textiles",
                        price: `89.99 ${countryMeta.currencySymbol}`,
                        rating: 4.9,
                        emoji: "🧵",
                        gradient: "from-indigo-500 to-purple-600",
                        badge: "New Arrival",
                        sold: "1.8K sold",
                      },
                      {
                        name: "Wooden Sculptures",
                        type: "Wood Crafts",
                        price: `199.99 ${countryMeta.currencySymbol}`,
                        rating: 5.0,
                        emoji: "🪵",
                        gradient: "from-emerald-500 to-teal-600",
                        badge: "Premium",
                        sold: "3.2K sold",
                      },
                    ].map((product, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ y: -6, scale: 1.05 }}
                        className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden group cursor-pointer hover:border-white/40 transition-all shadow-lg"
                      >
                        <div
                          className={`bg-gradient-to-br ${product.gradient} p-2 sm:p-4 md:p-7 flex items-center justify-between relative h-14 sm:h-20 md:h-28`}
                        >
                          <span className="text-3xl sm:text-4xl md:text-6xl drop-shadow-lg group-hover:scale-125 transition-transform">
                            {product.emoji}
                          </span>
                          <motion.span
                            animate={{ rotate: [0, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-[10px] sm:text-xs font-bold bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full border border-white/30"
                          >
                            {product.badge}
                          </motion.span>
                        </div>
                        <div className="p-2 sm:p-3 md:p-4">
                          <h3 className="text-xs sm:text-sm md:text-lg font-bold text-white mb-0.5 sm:mb-1 line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-white/70 text-[10px] sm:text-xs md:text-sm mb-1 sm:mb-2">
                            {product.type}
                          </p>
                          <div className="flex items-center justify-between mb-1 sm:mb-2">
                            <span className="text-sm sm:text-base md:text-lg font-bold text-amber-300">
                              {product.price}
                            </span>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-300 text-yellow-300" />
                              <span className="text-white font-semibold text-xs sm:text-sm">
                                {product.rating}
                              </span>
                            </div>
                          </div>
                          <p className="text-white/60 text-[10px] sm:text-xs mb-1 sm:mb-2 font-medium">
                            {product.sold}
                          </p>
                          <Link to="/blog">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="w-full bg-gradient-to-r from-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-yellow-500 text-amber-900 py-2 rounded-lg text-xs font-bold transition-all duration-300 group-hover:shadow-lg shadow-md flex items-center justify-center gap-1"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <AnimatedKeyboardText
                                text="Shop Now"
                                variant="fast"
                                delay={50}
                                className="text-amber-900"
                              />
                            </motion.button>
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-white/15 to-amber-100/15 backdrop-blur-md rounded-xl p-2 sm:p-3 md:p-6 text-center border border-white/20 w-full max-w-2xl hover:border-white/40 transition-all group"
                  >
                    <h3 className="gold-text mb-1 sm:mb-2">
                      <span
                        className="gold-text__shine"
                        data-text="Support Communities"
                      >
                        Support Communities
                      </span>
                    </h3>
                    <p className="text-white/90 mb-1 sm:mb-2 md:mb-4 text-xs sm:text-sm md:text-base">
                      Browse our collection and make a difference with every
                      purchase
                    </p>
                    <Link to="/blog">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-white text-amber-700 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-amber-50 transition-all duration-300 text-xs sm:text-sm shadow-md hover:shadow-lg inline-flex items-center gap-2"
                      >
                        <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                        <AnimatedKeyboardText
                          text="Shop Now"
                          variant="fast"
                          delay={50}
                          className="text-amber-700"
                        />
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* PANEL 3: Impact Dashboard - Emerald Gradient */}
            <div
              className="panel h-[100dvh] flex-shrink-0 relative overflow-hidden overscroll-contain"
              style={{ flexBasis: "100%", width: "100%", maxWidth: "100vw" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800" />
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-green-300 rounded-full blur-3xl animate-pulse"></div>
                <div
                  className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-emerald-300 rounded-full blur-3xl animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
              </div>
              <div className="relative z-10 w-full h-full flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl w-full flex flex-col items-center justify-center max-h-full">
                  <div className="text-center mb-3 sm:mb-4 md:mb-6">
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-block"
                    >
                      <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 mx-auto mb-1 sm:mb-2 md:mb-4 text-white" />
                    </motion.div>
                    <h2
                      className="gold-text mb-1 sm:mb-2 md:mb-3"
                      data-text="Impact Dashboard"
                    >
                      <span
                        className="gold-text__shine"
                        data-text="Impact Dashboard"
                      >
                        Impact Dashboard
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-1 sm:mb-2 md:mb-4 text-center max-w-2xl mx-auto px-2">
                      Track our collective impact on artisan communities across
                      {countryMeta.name}.
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-1 sm:gap-2 md:gap-4 w-full max-w-5xl mb-1.5 sm:mb-2 md:mb-6">
                    {[
                      {
                        value:
                          homeStats.artisanCount > 0
                            ? `${homeStats.artisanCount}+`
                            : "—",
                        label: "Artisans Supported",
                        icon: Users,
                        delay: 0,
                      },
                      {
                        value:
                          homeStats.businessCount > 0
                            ? `${homeStats.businessCount}+`
                            : "—",
                        label: "Businesses Registered",
                        icon: Heart,
                        delay: 0.2,
                      },
                      {
                        value:
                          homeStats.categoryCount > 0
                            ? `${homeStats.categoryCount}`
                            : "—",
                        label: "Categories",
                        icon: Building2,
                        delay: 0.4,
                      },
                      {
                        value: countryMeta.flag,
                        label: countryMeta.name,
                        icon: MapPin,
                        delay: 0.6,
                      },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: stat.delay }}
                        whileHover={{ y: -6, scale: 1.05 }}
                        className="bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl p-1 sm:p-2 md:p-4 text-center border border-white/20 hover:border-white/40 transition-all cursor-pointer group shadow-lg hover:shadow-xl"
                      >
                        <stat.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-8 md:h-8 mx-auto mb-0 sm:mb-1 md:mb-2 text-emerald-200 group-hover:text-emerald-100 transition-colors" />
                        <motion.span
                          className="text-xs sm:text-base md:text-2xl font-bold text-white block"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: stat.delay + 0.3 }}
                        >
                          {stat.value}
                        </motion.span>
                        <span className="text-white/80 text-[8px] sm:text-[10px] md:text-sm font-semibold group-hover:text-white/90 transition-colors leading-tight">
                          {stat.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="w-full max-w-5xl grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-6 mb-1.5 sm:mb-2 md:mb-6">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/10 backdrop-blur-md rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all"
                    >
                      <h3 className="text-[10px] sm:text-sm md:text-lg font-bold text-white mb-1 sm:mb-2 md:mb-4 flex items-center gap-1 sm:gap-2">
                        <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        Community Growth
                      </h3>
                      <div className="space-y-1 sm:space-y-1.5 md:space-y-3">
                        {[
                          {
                            label: "Active Programs",
                            value: 98,
                            color: "from-emerald-400 to-emerald-600",
                          },
                          {
                            label: "Skill Training",
                            value: 95,
                            color: "from-green-400 to-green-600",
                          },
                          {
                            label: "Cultural Events",
                            value: 87,
                            color: "from-teal-400 to-teal-600",
                          },
                        ].map((item, i) => (
                          <div key={i}>
                            <div className="flex justify-between mb-0.5 sm:mb-1">
                              <span className="text-white/90 text-[9px] sm:text-xs md:text-sm font-semibold">
                                {item.label}
                              </span>
                              <span className="text-emerald-300 font-bold text-[9px] sm:text-xs md:text-sm">
                                {item.value}%
                              </span>
                            </div>
                            <motion.div
                              className="h-1 sm:h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden"
                              initial={{ scaleX: 0 }}
                              whileInView={{ scaleX: 1 }}
                              transition={{ delay: i * 0.2, duration: 1 }}
                            >
                              <motion.div
                                className={`h-full bg-gradient-to-r ${item.color}`}
                                initial={{ scaleX: 0 }}
                                whileInView={{ scaleX: item.value / 100 }}
                                transition={{
                                  delay: i * 0.2 + 0.3,
                                  duration: 1,
                                }}
                                style={{ originX: 0 }}
                              />
                            </motion.div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/10 backdrop-blur-md rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 transition-all"
                    >
                      <h3 className="text-[10px] sm:text-sm md:text-lg font-bold text-white mb-1 sm:mb-2 md:mb-4 flex items-center gap-1 sm:gap-2">
                        <Globe className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        {countryMeta.name} Overview
                      </h3>
                      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 md:gap-3">
                        {[
                          {
                            region: "Businesses",
                            artisans: homeStats.businessCount,
                          },
                          {
                            region: "Artisans",
                            artisans: homeStats.artisanCount,
                          },
                          {
                            region: "Categories",
                            artisans: homeStats.categoryCount,
                          },
                          {
                            region: "Currency",
                            artisans: countryMeta.currencySymbol,
                          },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-gradient-to-br from-white/10 to-white/5 rounded-lg p-1 sm:p-2 md:p-3 text-center border border-white/10"
                          >
                            <span className="text-white/80 text-[8px] sm:text-[10px] md:text-xs font-semibold">
                              {item.region}
                            </span>
                            <div className="text-sm sm:text-base md:text-xl font-bold text-emerald-300 mt-0.5">
                              {item.artisans}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-white/15 to-emerald-100/15 backdrop-blur-md rounded-xl p-2 sm:p-3 md:p-6 text-center border border-white/20 w-full max-w-2xl hover:border-white/40 transition-all group"
                  >
                    <h3 className="text-sm sm:text-base md:text-xl font-bold text-white mb-1 group-hover:text-emerald-200 transition-colors">
                      See Our Impact in Action
                    </h3>
                    <p className="text-white/90 mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">
                      Track real-time progress and community transformation
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Link to="/impact">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-white text-emerald-700 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-emerald-50 transition-all duration-300 text-xs sm:text-sm shadow-md hover:shadow-lg inline-flex items-center gap-2"
                        >
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                          View Impact
                        </motion.button>
                      </Link>
                      <Link to="/impact">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="border-2 border-white text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-white/10 transition-all duration-300 text-xs sm:text-sm"
                        >
                          Full Report
                        </motion.button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* PANEL 4: Get Involved - Teal Gradient */}
            <div
              className="panel h-[100dvh] flex-shrink-0 relative overflow-hidden overscroll-contain"
              style={{ flexBasis: "100%", width: "100%", maxWidth: "100vw" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800" />
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-300 rounded-full blur-3xl"></div>
                <div
                  className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-teal-300 rounded-full blur-3xl animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>
              <div className="relative z-10 w-full h-full flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl w-full flex flex-col items-center justify-center max-h-full">
                  <div className="text-center mb-3 sm:mb-4 md:mb-6">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-block"
                    >
                      <Handshake className="w-5 h-5 sm:w-8 sm:h-8 md:w-12 md:h-12 lg:w-16 lg:h-16 mx-auto mb-1 sm:mb-2 md:mb-4 text-white" />
                    </motion.div>
                    <h2
                      className="gold-text mb-1 sm:mb-2 md:mb-3"
                      data-text="Get Involved"
                    >
                      <span
                        className="gold-text__shine"
                        data-text="Get Involved"
                      >
                        Get Involved
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-1 sm:mb-2 md:mb-4 text-center max-w-2xl mx-auto px-2">
                      Join our movement to empower artisans and transform
                      communities across {countryMeta.name}.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-6 w-full max-w-5xl mb-2 sm:mb-3 md:mb-6">
                    {[
                      {
                        title: "Volunteer",
                        desc: "Share your skills with artisan communities",
                        icon: Users,
                        action: "Join Team",
                        href: "/get-involved",
                        color: "from-teal-400 to-teal-600",
                        count: "245+ volunteers",
                      },
                      {
                        title: "Donate",
                        desc: "Support our programs and initiatives",
                        icon: Heart,
                        action: "Give Now",
                        href: "/artihuman-foundation",
                        color: "from-rose-400 to-pink-600",
                        count: "$125K+ raised",
                      },
                      {
                        title: "Partner",
                        desc: "Collaborate with us for greater impact",
                        icon: Handshake,
                        action: "Partner Up",
                        href: "/partners",
                        color: "from-indigo-400 to-purple-600",
                        count: "50+ partners",
                      },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                        whileHover={{ y: -6, scale: 1.05 }}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-2 sm:p-3 md:p-6 border border-white/20 hover:border-white/40 text-center group shadow-lg hover:shadow-xl transition-all cursor-pointer"
                      >
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 md:w-16 md:h-16 mx-auto mb-1 sm:mb-2 md:mb-3 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                        >
                          <item.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-8 md:h-8 text-white" />
                        </div>
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-0.5 sm:mb-1">
                          {item.title}
                        </h3>
                        <p className="text-white/80 text-[10px] sm:text-xs md:text-sm mb-1 sm:mb-2 md:mb-4">
                          {item.desc}
                        </p>
                        <motion.div
                          className="inline-block mb-1 sm:mb-2 md:mb-4 px-2 py-0.5 sm:px-3 sm:py-1 bg-white/10 rounded-full border border-white/20"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                          }}
                        >
                          <span className="text-emerald-300 font-bold text-[10px] sm:text-xs md:text-sm">
                            {item.count}
                          </span>
                        </motion.div>
                        <Link to={item.href}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full bg-gradient-to-r from-white to-teal-100 text-teal-700 py-1.5 sm:py-2 rounded-lg font-bold hover:from-teal-50 hover:to-teal-200 transition-all duration-300 text-[10px] sm:text-xs md:text-sm shadow-md hover:shadow-lg group-hover:shadow-xl"
                          >
                            {item.action}
                          </motion.button>
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-r from-white/15 to-teal-100/15 backdrop-blur-md rounded-xl p-2 sm:p-3 md:p-6 text-center border border-white/20 w-full max-w-2xl hover:border-white/40 transition-all group"
                  >
                    <h3 className="text-sm sm:text-base md:text-xl font-bold text-white mb-1 group-hover:text-teal-200 transition-colors">
                      Transform Lives Through Art
                    </h3>
                    <p className="text-white/90 mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">
                      Your support creates lasting change in artisan communities
                    </p>
                    <Link to="/get-involved">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-white text-teal-700 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-teal-50 transition-all duration-300 text-xs sm:text-sm shadow-md hover:shadow-lg inline-flex items-center gap-2"
                      >
                        <Handshake className="w-3 h-3 sm:w-4 sm:h-4" />
                        Start Making a Difference
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Artisans Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <span className="text-emerald-400 font-semibold text-sm md:text-lg mb-2 block">
              Meet Our Artisans
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
              Featured Artisans
            </h2>
            <p className="text-base md:text-xl text-gray-400 max-w-3xl mx-auto px-4">
              Meet some of the talented artisans we support across{" "}
              {countryMeta.name}
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
                    name: a.name || "Unknown Artist",
                    role: a.genre || "Artisan",
                    specialty: a.genre || "Crafts",
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
                    name: "Featured Artisan",
                    role: "Textile Weaver",
                    specialty: "Traditional Textiles",
                    image: "FA",
                    location: countryMeta.name,
                    rating: 4.9,
                    color: "from-indigo-500 to-purple-600",
                  },
                  {
                    name: "Featured Artisan",
                    role: "Wood Carver",
                    specialty: "Traditional Sculptures",
                    image: "FA",
                    location: countryMeta.name,
                    rating: 4.8,
                    color: "from-amber-500 to-orange-600",
                  },
                  {
                    name: "Featured Artisan",
                    role: "Pottery Artist",
                    specialty: "Traditional Pottery",
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
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg rounded-xl md:rounded-3xl overflow-hidden border border-slate-700/50 hover:border-emerald-500/60 transition-all shadow-lg hover:shadow-2xl hover:shadow-emerald-500/10 group"
              >
                <div
                  className={`bg-gradient-to-r ${artisan.color} p-4 md:p-6 flex items-center gap-3 md:gap-4`}
                >
                  <div className="w-14 h-14 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-xl md:rounded-2xl flex items-center justify-center text-white text-xl md:text-2xl font-bold border border-white/30 shadow-inner">
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
                      View Profile
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Annuaire Musicale - Artist Directory Section */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-slate-900 via-purple-900/60 to-slate-900 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
              d'artistes à travers {countryMeta.name}
            </p>
          </div>

          {/* Search Card */}
          <Card className="bg-gradient-to-br from-slate-800/90 to-purple-900/90 backdrop-blur-md border-purple-700 shadow-2xl mb-12">
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
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleArtistAnnuaireSearch()
                    }
                  />
                </div>

                <Button
                  onClick={() => handleArtistAnnuaireSearch()}
                  disabled={isArtistAnnuaireSearching}
                  className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white px-8"
                >
                  {isArtistAnnuaireSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recherche...
                    </>
                  ) : (
                    <>
                      <Search size={18} className="mr-2" />
                      Rechercher
                    </>
                  )}
                </Button>
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
                              className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 border border-gray-700 hover:border-purple-500/40 cursor-pointer group"
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
                                        : "🆓 Unsigned"}
                                  </Badge>
                                  {artist.spotify_url && (
                                    <a
                                      href={artist.spotify_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors text-xs"
                                    >
                                      <Music className="h-3.5 w-3.5" />
                                      Spotify
                                    </a>
                                  )}
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

      {/* Verso Air Music Artists Section */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-8 md:mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-purple-400 font-semibold text-sm md:text-lg mb-2 inline-flex items-center justify-center gap-2"
            >
              <Music className="w-5 h-5" />
              Verso Air ™️ Music Label
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4"
            >
              Registered Artists
            </motion.h2>
            <p className="text-base md:text-xl text-purple-200 max-w-3xl mx-auto px-4">
              Discover talented artists signed to our exclusive music label
            </p>
          </div>

          <MusicArtistsGrid countryCode={selectedCountry} />

          <div className="text-center mt-8 md:mt-12">
            <Link to="/artist-portal">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold hover:from-purple-600 hover:to-pink-600 transition-all inline-flex items-center gap-2 shadow-xl"
              >
                <Music className="w-5 h-5" />
                Visit Artist Portal
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* Partners & Sponsors Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-emerald-600 font-semibold text-sm md:text-lg mb-2 block"
            >
              Our Supporters
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4"
            >
              Partners & Sponsors
            </motion.h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Organizations supporting artisan communities across{" "}
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
                View All Partners
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/sponsor">
              <Button
                variant="outline"
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-bold rounded-xl px-6 py-3"
              >
                Become a Sponsor
                <Handshake className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
      <section className="py-12 md:py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-emerald-600 font-semibold text-sm md:text-lg mb-2 block"
            >
              Volunteer With Us
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4"
            >
              Make a Difference
            </motion.h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Join our volunteer programs and help transform artisan communities
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {[
              {
                title: "Art Mentorship",
                desc: "Guide aspiring artisans in developing their craft",
                icon: Palette,
                volunteers: 85,
                capacity: 100,
                color: "from-violet-600 to-indigo-700",
                tag: "Creative",
              },
              {
                title: "Community Outreach",
                desc: "Work directly with local communities on cultural programs",
                icon: Users,
                volunteers: 120,
                capacity: 150,
                color: "from-emerald-600 to-teal-700",
                tag: "Field Work",
              },
              {
                title: "Skill Development",
                desc: "Teach business and technical skills to artisans",
                icon: Briefcase,
                volunteers: 95,
                capacity: 120,
                color: "from-amber-500 to-orange-600",
                tag: "Training",
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
                  <div className="absolute top-3 right-3 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/30">
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
                      Active Volunteers
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
                    {opportunity.volunteers}/{opportunity.capacity} spots filled
                  </p>
                  <Link to="/get-involved">
                    <button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-2 md:py-3 rounded-lg md:rounded-xl font-bold hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md md:shadow-lg text-sm md:text-base group-hover:shadow-emerald-500/30">
                      Apply Now
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

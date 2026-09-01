import { Link, useLocation } from "wouter";
import { isContentNavPath } from "@/components/ContentNav";
import {
  ChevronDown,
  Music,
  MapPin,
  Search,
  Globe,
  Lock,
  ShoppingBag,
  User,
  LayoutDashboard,
  Mic2,
  Radio,
  Shield,
  Users,
  Wrench,
  Zap,
  MessageCircle,
  Bell,
} from "lucide-react";
import { Button } from "./button";
import AnimatedKeyboardText from "@/components/AnimatedKeyboardText";
import { useState, useEffect, useRef } from "react";
import Logo from "../attached_assets/logo.png";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuthContext } from "@/contexts/AuthContext";
import { LogoutDropdown } from "@/components/ui/logout-dropdown";
import { usePortalAccess } from "@/hooks/usePortalAccess";
import type { PortalId } from "@/lib/portal-access";
import styles from "./versoair-logo.module.css";
import SearchModal from "@/components/SearchModal";
import NotificationCenter from "@/components/NotificationCenter";
import { getDashboardDestination } from "@/lib/dashboard-routes";

// Portal metadata for the switcher dropdown
const PORTAL_META: Record<
  PortalId,
  { label: string; icon: React.ReactNode; path: string; color: string }
> = {
  general: {
    label: "Dashboard",
    icon: <LayoutDashboard className="w-3.5 h-3.5" />,
    path: "/dashboard",
    color: "text-blue-400",
  },
  streamer: {
    label: "Streamer",
    icon: <Radio className="w-3.5 h-3.5" />,
    path: "/streamer-portal",
    color: "text-purple-400",
  },
  artist: {
    label: "Artist",
    icon: <Mic2 className="w-3.5 h-3.5" />,
    path: "/artist-portal/welcome",
    color: "text-pink-400",
  },
  "geo-admin": {
    label: "GeoAdmin",
    icon: <Globe className="w-3.5 h-3.5" />,
    path: "/geo-admin",
    color: "text-emerald-400",
  },
  community: {
    label: "Community",
    icon: <Users className="w-3.5 h-3.5" />,
    path: "/blog",
    color: "text-amber-400",
  },
  contractor: {
    label: "Contractor",
    icon: <Wrench className="w-3.5 h-3.5" />,
    path: "/contractor",
    color: "text-cyan-400",
  },
  admin: {
    label: "Admin",
    icon: <Shield className="w-3.5 h-3.5" />,
    path: "/admin",
    color: "text-red-400",
  },
};

interface NavbarProps {
  onLocationPanelToggle: () => void;
  isLocationPanelOpen?: boolean;
}

export default function Navbar({
  onLocationPanelToggle,
  isLocationPanelOpen,
}: NavbarProps) {
  const tabletNavItemClass =
    "text-sm px-3 py-1.5 rounded-md whitespace-nowrap transition-colors font-medium shrink-0 select-none touch-pan-x";
  const tabletNavIconItemClass =
    "text-sm px-3 py-1.5 rounded-md flex items-center whitespace-nowrap transition-colors font-medium shrink-0 select-none touch-pan-x";

  // Call ALL hooks FIRST before any conditional logic
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandHovered, setBrandHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [marketplaceSos, setMarketplaceSos] = useState(false);

  const [location, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading, tier } = useSubscription();
  const { user } = useAuthContext();

  // Detect if user is authenticated via ANY portal (not just general auth)
  const hasPortalAuth =
    !!localStorage.getItem("artist_token") ||
    localStorage.getItem("blog_community_auth") === "true" ||
    !!localStorage.getItem("geoadmin_session") ||
    !!localStorage.getItem("adminAccessTime");

  useEffect(() => {
    const handler = (e: Event) => {
      // @ts-ignore
      const open = Boolean((e as CustomEvent).detail?.open);
      setMobileMenuOpen(open);
    };
    window.addEventListener("mobile-menu-toggle", handler as EventListener);
    return () =>
      window.removeEventListener(
        "mobile-menu-toggle",
        handler as EventListener,
      );
  }, []);

  // Listen for Shop Now SOS signal
  useEffect(() => {
    const handleSos = () => {
      setMarketplaceSos(true);
      // Flash for 4 seconds then auto-navigate to marketplace
      setTimeout(() => {
        setMarketplaceSos(false);
        navigate("/marketplace");
      }, 4000);
    };
    window.addEventListener("marketplace-sos", handleSos);
    return () => window.removeEventListener("marketplace-sos", handleSos);
  }, [navigate]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const controlNavbar = () => {
      if (typeof window !== "undefined") {
        const currentScrollY = window.scrollY;
        if (currentScrollY < lastScrollY || currentScrollY < 10) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener("scroll", controlNavbar, { passive: true });
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY, isMobile]);

  // Don't render navbar on /blog, /marketplace, auth pages, or when ContentNav is active
  const navAuthed =
    !!user || localStorage.getItem("blog_community_auth") === "true";
  if (location === "/blog" || location === "/marketplace") {
    return null;
  }
  if (location.startsWith("/auth")) {
    return null;
  }
  if (isContentNavPath(location) && navAuthed) {
    return null;
  }

  const isPanelOpen = isLocationPanelOpen || mobileMenuOpen;

  const navbarClasses = `sticky top-[4.5rem] z-40 border-b border-slate-200/80 bg-[#f7f5f1]/90 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ${
    isPanelOpen ? "opacity-60" : "opacity-100"
  } ${
    isMobile
      ? isVisible
        ? "transform translate-y-0"
        : "transform -translate-y-full"
      : ""
  }`;

  return (
    <nav className={navbarClasses} style={{ overflow: "visible" }}>
      <div
        className="mx-auto max-w-[1600px] px-3 md:px-5"
        style={{ overflow: "visible" }}
      >
        <div
          className="flex items-center justify-between h-16 gap-2"
          style={{ overflow: "visible" }}
        >
          {/* 🔥 LOGO + BRAND (Clickable) - UPDATED */}
          <Link
            href="/"
            className="flex items-center flex-shrink-0 mr-2 overflow-visible"
            onMouseEnter={() => setBrandHovered(true)}
            onMouseLeave={() => setBrandHovered(false)}
          >
            <div className="relative group overflow-visible p-1">
              <div
                className="
                absolute -inset-2
                bg-gradient-to-r from-yellow-500 via-yellow-800 to-yellow-500
                rounded-xl blur-md opacity-0 
                group-hover:opacity-50
                transition-all duration-900
                pointer-events-none
              "
              />
              <img
                src="https://i.ibb.co/d0PtnHS2/Adobe-Express-file.png"
                alt="Verso Air Logo"
                className="
                  relative h-14 md:h-16 xl:h-20 w-auto
                  brightness-0
                  transition-all duration-500
                  group-hover:brightness-110
                  group-hover:scale-110
                  group-hover:drop-shadow-[0_0_15px_rgba(234,179,8,0.7)]
                "
              />
            </div>

            <span className="ml-2 text-base xl:text-lg font-bold whitespace-nowrap hidden xl:inline notranslate">
              <AnimatedKeyboardText
                text={isMobile ? "versoair™" : "versoair™"}
                variant="default"
                delay={100}
                className="text-amber-500"
              />
            </span>
          </Link>

          {/* Main Navigation - Desktop */}
          <div className="hidden xl:flex items-center space-x-1 flex-shrink-0">
            <Link
              href="/"
              className="text-gray-600 hover:text-primary transition-colors px-2 py-1 text-sm whitespace-nowrap"
            >
              Accueil
            </Link>

            <Link
              href="/about"
              className="text-gray-600 hover:text-primary transition-colors px-2 py-1 text-sm whitespace-nowrap"
            >
              À propos
            </Link>

            {/* 🌍 Geo Admin Portal Link */}
            {isAuthenticated &&
            (tier !== "free" || user?.role === "superuser" || user?.isAdmin) ? (
              <Link
                href="/geo-admin"
                className="text-gray-600 hover:text-primary transition-colors px-2 py-1 text-sm whitespace-nowrap flex items-center"
              >
                <Globe className="mr-1 h-3 w-3" />
                Géo Admin
              </Link>
            ) : (
              <Link
                href="/geo-admin"
                className="text-gray-400 px-2 py-1 text-sm whitespace-nowrap flex items-center gap-1 group relative cursor-pointer"
              >
                <Lock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Géo Admin</span>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {isAuthenticated
                    ? "Abonnement premium requis"
                    : "Connectez-vous pour accéder"}
                </span>
              </Link>
            )}

            {/* Entreprises Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center px-2 py-1 text-sm whitespace-nowrap">
                Entreprises <ChevronDown className="ml-1 h-3 w-3" />
              </button>
              <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg mt-1 py-2 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="grid grid-cols-2 gap-x-1">
                  <Link
                    href="/sante"
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Santé
                  </Link>
                  <Link
                    href="/finances"
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Finance
                  </Link>
                  <Link
                    href="/batiment"
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Bâtiment
                  </Link>
                  <Link
                    href="/hotellerie"
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Hôtellerie
                  </Link>
                  <Link
                    href="/automobile"
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Automobile
                  </Link>
                  <Link
                    href="/commerce"
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Commerce
                  </Link>
                  <Link
                    href="/logement"
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    🏠 Logement
                  </Link>
                  <Link
                    href="/divertissement"
                    className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Divertissement
                  </Link>
                  <Link
                    href="/businesses-directory"
                    className="col-span-2 block px-4 py-2 text-gray-600 hover:bg-gray-100 text-center border-t border-gray-100 mt-1 pt-2 font-medium"
                  >
                    Annuaire
                  </Link>
                </div>
              </div>
            </div>

            {/* Services & More Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center px-2 py-1 text-sm whitespace-nowrap">
                Services <ChevronDown className="ml-1 h-3 w-3" />
              </button>
              <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg mt-1 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-max">
                <Link
                  href="/services"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap font-medium"
                >
                  Tous les services
                </Link>
                <div className="border-t border-gray-200 my-1"></div>
                <Link
                  href="/services/news"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Actualités
                </Link>
                <Link
                  href="/services/careers"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Carrières
                </Link>
                <Link
                  href="/services/contractors"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Prestataires
                </Link>
              </div>
            </div>

            {/* Marketing Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center px-2 py-1 text-sm whitespace-nowrap">
                Marketing <ChevronDown className="ml-1 h-3 w-3" />
              </button>
              <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg mt-1 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-max">
                <Link
                  href="/marketing"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap font-medium"
                >
                  Hub Marketing
                </Link>
                <div className="border-t border-gray-200 my-1"></div>
                <Link
                  href="/marketing/journal"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Journal publicitaire
                </Link>
                <Link
                  href="/marketing/packs"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Packs Marketing
                </Link>
                <Link
                  href="/marketing/print"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Services d'impression
                </Link>
                <Link
                  href="/marketing/newsletters"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Infolettre
                </Link>
              </div>
            </div>

            <Link
              href="/reservations"
              className="text-gray-600 hover:text-primary transition-colors px-2 py-1 text-sm whitespace-nowrap"
            >
              Réservations
            </Link>

            {/* Marketplace with SOS signal animation */}
            <Link
              href="/marketplace"
              className={`relative px-2 py-1 text-sm whitespace-nowrap flex items-center gap-1 transition-all duration-300 ${
                marketplaceSos
                  ? "text-amber-600 font-bold scale-110"
                  : "text-gray-600 hover:text-primary"
              }`}
            >
              {marketplaceSos && (
                <>
                  <span className="absolute -inset-2 bg-amber-400/20 rounded-lg animate-ping" />
                  <span className="absolute -inset-1 bg-gradient-to-r from-amber-400/30 to-orange-400/30 rounded-lg animate-pulse" />
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold animate-bounce whitespace-nowrap shadow-lg z-50">
                    👆 CLICK HERE
                  </span>
                </>
              )}
              <ShoppingBag
                className={`h-3.5 w-3.5 ${marketplaceSos ? "animate-bounce text-amber-600" : ""}`}
              />
              <span className="relative notranslate">Marché</span>
            </Link>

            {/* Assistance Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center px-2 py-1 text-sm whitespace-nowrap">
                Aide <ChevronDown className="ml-1 h-3 w-3" />
              </button>
              <div className="absolute top-full right-0 bg-white shadow-lg rounded-lg mt-1 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-max">
                <Link
                  href="/sav"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  SAV 24/7
                </Link>
                <Link
                  href="/versoai"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  VersoAI
                </Link>
              </div>
            </div>
          </div>

          {/* Tablet Navigation — scrollable colored strip */}
          <div
            className="hidden md:flex xl:hidden min-w-0 mx-1 lg:mx-2 flex-1 items-center overflow-x-auto overflow-y-visible scrollbar-hide pb-[350px] -mb-[350px]"
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorX: "contain",
              touchAction: "pan-x",
              willChange: "scroll-position",
              transform: "translateZ(0)",
              pointerEvents: "none",
            }}
          >
            <div
              className="inline-flex items-center gap-0.5 lg:gap-1 shrink-0"
              style={{ touchAction: "pan-x", pointerEvents: "auto" }}
            >
              {/* Home — purple (brand) */}
              <Link
                href="/"
                className={`text-purple-600 hover:text-purple-800 hover:bg-purple-50 ${tabletNavItemClass}`}
              >
                Accueil
              </Link>

              {/* Geo Admin — sky */}
              {isAuthenticated &&
              (tier !== "free" ||
                user?.role === "superuser" ||
                user?.isAdmin) ? (
                <Link
                  href="/geo-admin"
                  className={`text-sky-600 hover:text-sky-800 hover:bg-sky-50 gap-1.5 ${tabletNavIconItemClass}`}
                >
                  <Globe className="h-4 w-4" />
                  Geo
                </Link>
              ) : (
                <Link
                  href="/geo-admin"
                  className={`text-sky-300 hover:bg-sky-50 gap-1.5 relative group ${tabletNavIconItemClass}`}
                >
                  <Lock className="h-4 w-4" />
                  Geo
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {isAuthenticated
                      ? "Abonnement premium requis"
                      : "Connectez-vous"}
                  </span>
                </Link>
              )}

              <div className="w-px h-4 bg-gray-200 shrink-0" />

              {/* Entreprises — amber */}
              <div className="relative group shrink-0">
                <button
                  className={`text-amber-600 hover:text-amber-800 hover:bg-amber-50 gap-1 ${tabletNavIconItemClass}`}
                >
                  Entreprises <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-xl mt-2 py-3 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-amber-100">
                  <div className="grid grid-cols-2 gap-0.5 px-1">
                    <Link
                      href="/sante"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                    >
                      Santé
                    </Link>
                    <Link
                      href="/finances"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                    >
                      Finance
                    </Link>
                    <Link
                      href="/batiment"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                    >
                      Bâtiment
                    </Link>
                    <Link
                      href="/hotellerie"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                    >
                      Hôtellerie
                    </Link>
                    <Link
                      href="/automobile"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                    >
                      Automobile
                    </Link>
                    <Link
                      href="/commerce"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                    >
                      Commerce
                    </Link>
                    <Link
                      href="/logement"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                    >
                      Logement
                    </Link>
                    <Link
                      href="/divertissement"
                      className="block px-3 py-2 text-sm text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                    >
                      Divertissement
                    </Link>
                  </div>
                  <div className="border-t border-amber-100 mt-2 pt-2 px-1">
                    <Link
                      href="/businesses-directory"
                      className="block px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg text-center font-medium transition-colors"
                    >
                      Annuaire
                    </Link>
                  </div>
                </div>
              </div>

              {/* Services — emerald */}
              <div className="relative group shrink-0">
                <button
                  className={`text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 gap-1 ${tabletNavIconItemClass}`}
                >
                  Services <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-xl mt-2 py-2 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-emerald-100">
                  <Link
                    href="/services"
                    className="block px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg mx-1 font-medium transition-colors"
                  >
                    Tous les services
                  </Link>
                  <Link
                    href="/services/news"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg mx-1 transition-colors"
                  >
                    Actualités
                  </Link>
                  <Link
                    href="/services/careers"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg mx-1 transition-colors"
                  >
                    Carrières
                  </Link>
                  <Link
                    href="/services/contractors"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg mx-1 transition-colors"
                  >
                    Prestataires
                  </Link>
                  <div className="border-t border-emerald-100 my-1 mx-2" />
                  <Link
                    href="/about"
                    className="block px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg mx-1 font-medium transition-colors"
                  >
                    À propos
                  </Link>
                </div>
              </div>

              {/* Marketing — pink */}
              <div className="relative group shrink-0">
                <button
                  className={`text-pink-600 hover:text-pink-800 hover:bg-pink-50 gap-1 ${tabletNavIconItemClass}`}
                >
                  Marketing <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-xl mt-2 py-2 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-pink-100">
                  <Link
                    href="/marketing"
                    className="block px-4 py-2 text-sm text-pink-700 hover:bg-pink-50 hover:text-pink-800 rounded-lg mx-1 font-medium transition-colors"
                  >
                    Hub Marketing
                  </Link>
                  <div className="border-t border-pink-100 my-1 mx-2" />
                  <Link
                    href="/marketing/journal"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-700 rounded-lg mx-1 transition-colors"
                  >
                    Journal publicitaire
                  </Link>
                  <Link
                    href="/marketing/packs"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-700 rounded-lg mx-1 transition-colors"
                  >
                    Packs Marketing
                  </Link>
                  <Link
                    href="/marketing/print"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-700 rounded-lg mx-1 transition-colors"
                  >
                    Services d'impression
                  </Link>
                  <Link
                    href="/marketing/newsletters"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-pink-50 hover:text-pink-700 rounded-lg mx-1 transition-colors"
                  >
                    Infolettre
                  </Link>
                </div>
              </div>

              <div className="w-px h-4 bg-gray-200 shrink-0" />

              {/* Reservations — indigo */}
              <Link
                href="/reservations"
                className={`text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 ${tabletNavItemClass}`}
              >
                Réservations
              </Link>

              {/* Marketplace — violet */}
              <Link
                href="/marketplace"
                className={`relative gap-1 ${tabletNavIconItemClass} transition-all duration-300 ${
                  marketplaceSos
                    ? "text-amber-600 font-bold bg-amber-50 scale-105"
                    : "text-violet-600 hover:text-violet-800 hover:bg-violet-50"
                }`}
              >
                {marketplaceSos && (
                  <>
                    <span className="absolute -inset-1 bg-amber-400/20 rounded-lg animate-ping" />
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-bounce whitespace-nowrap shadow-lg z-50">
                      👆 HERE
                    </span>
                  </>
                )}
                <ShoppingBag
                  className={`h-4 w-4 ${marketplaceSos ? "animate-bounce text-amber-600" : ""}`}
                />
                <span className="hidden lg:inline notranslate">Marché</span>
                <span className="lg:hidden notranslate">Marché</span>
              </Link>

              {/* Support — teal */}
              <div className="relative group shrink-0">
                <button
                  className={`text-teal-600 hover:text-teal-800 hover:bg-teal-50 gap-1 ${tabletNavIconItemClass}`}
                >
                  Aide <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute top-full right-0 bg-white shadow-xl rounded-xl mt-2 py-2 w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-teal-100">
                  <Link
                    href="/sav"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-teal-50 hover:text-teal-700 rounded-lg mx-1 transition-colors"
                  >
                    SAV 24/7
                  </Link>
                  <Link
                    href="/versoai"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-teal-50 hover:text-teal-700 rounded-lg mx-1 transition-colors"
                  >
                    VersoAI
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Music Portal Toggle → same-origin /artist-portal, never cross-domain */}
            <Button
              onClick={() => {
                window.location.href =
                  window.location.origin + "/artist-portal";
              }}
              className="portal-toggle bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 lg:px-3 py-2 rounded-md text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Music className="h-3 w-3 lg:mr-1" />
              <span className="hidden lg:inline notranslate">Verso Air</span>
            </Button>

            {/* Location Panel Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onLocationPanelToggle}
              className="text-gray-600 hover:text-primary p-2 rounded-md transition-colors flex-shrink-0"
            >
              <MapPin className="h-4 w-4" />
            </Button>

            {/* Search icon — opens modal on all screen sizes */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:block text-gray-600 hover:text-primary p-2 rounded-md transition-colors flex-shrink-0"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Messages — opens the globally mounted MessengerPanel */}
            {user && (
              <button
                onClick={() => window.dispatchEvent(new Event("messenger:open"))}
                className="text-gray-600 hover:text-primary p-2 rounded-md transition-colors flex-shrink-0"
                aria-label="Messages"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            )}

            {/* Notifications — bell icon with unread badge */}
            {user && <NotificationCenter />}

            {/* User Actions - Always visible */}
            {user ? (
              <div className="flex items-center gap-1.5">
                <PortalSwitcher currentPath={location} navigate={navigate} />
                <LogoutDropdown variant="red-solid" />
              </div>
            ) : hasPortalAuth ? (
              /* Logged in via another portal (artist, blog, etc.) but not general auth */
              <div className="flex items-center gap-1">
                <div className="relative group">
                  <Button
                    disabled
                    aria-label="Already connected via another portal"
                    className="h-8 bg-slate-800/50 text-slate-500 px-1.5 md:px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap border border-slate-700 cursor-not-allowed opacity-50"
                  >
                    <Lock className="h-3 w-3" />
                    <span className="ml-1">Connecté</span>
                  </Button>
                  <span className="absolute -bottom-8 right-0 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    Déjà connecté via un autre portail
                  </span>
                </div>
                <LogoutDropdown variant="red-solid" />
              </div>
            ) : (
              <Link href="/auth/signin" className="flex-shrink-0">
                <Button className="bg-slate-800 text-slate-200 px-2 md:px-4 py-2 rounded-md hover:bg-slate-700 transition-colors text-xs font-medium whitespace-nowrap border border-slate-600">
                  <span className="hidden sm:inline">Connexion</span>
                  <span className="sm:hidden">Connexion</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </nav>
  );
}

// ─── Portal Switcher Dropdown ───
function PortalSwitcher({
  currentPath,
  navigate,
}: {
  currentPath: string;
  navigate: (to: string) => void;
}) {
  const { accessiblePortals } = usePortalAccess();
  const { user } = useAuthContext();
  const dashboard = getDashboardDestination(user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // If only general + streamer, just show dashboard button
  if (accessiblePortals.length <= 2) {
    if (currentPath === "/dashboard") return null;
    return (
      <button
        onClick={() => navigate(dashboard.path)}
        className="flex-shrink-0 flex items-center gap-1 bg-slate-700 text-slate-200 px-2 py-2 rounded-md hover:bg-slate-600 transition-colors text-xs"
        title={dashboard.label}
      >
        <User className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex-shrink-0 flex items-center gap-1 bg-slate-700 text-slate-200 px-2 py-2 rounded-md hover:bg-slate-600 transition-colors text-xs"
        title="Switch Portal"
      >
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          {/* Full-viewport backdrop: greys out the page and closes on outside click */}
          <div
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl shadow-black/60 z-[9999] overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Switch Portal
              </p>
            </div>
            {accessiblePortals.map((pid) => {
              const meta = PORTAL_META[pid];
              if (!meta) return null;
              const isActive = currentPath.startsWith(
                meta.path.split("/").slice(0, 2).join("/"),
              );
              return (
                <button
                  key={pid}
                  onClick={() => {
                    navigate(meta.path);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-slate-700/70 text-white"
                      : "text-slate-300 hover:bg-slate-700/40 hover:text-white"
                  }`}
                >
                  <span className={meta.color}>{meta.icon}</span>
                  <span className="font-medium">{meta.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

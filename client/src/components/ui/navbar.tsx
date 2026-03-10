import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  Music,
  MapPin,
  Search,
  Globe,
  Lock,
  LogOut,
  CreditCard,
} from "lucide-react";
import { Button } from "./button";
import AnimatedKeyboardText from "@/components/AnimatedKeyboardText";
import { useState, useEffect } from "react";
import Logo from "../attached_assets/logo.png";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuthContext } from "@/contexts/AuthContext";
import styles from "./versoair-logo.module.css";
import SearchModal from "@/components/SearchModal";

interface NavbarProps {
  onMusicPortalToggle: () => void;
  onLocationPanelToggle: () => void;
  isMusicPortalOpen?: boolean;
  isLocationPanelOpen?: boolean;
}

export default function Navbar({
  onMusicPortalToggle,
  onLocationPanelToggle,
  isMusicPortalOpen,
  isLocationPanelOpen,
}: NavbarProps) {
  // Call ALL hooks FIRST before any conditional logic
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandHovered, setBrandHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useSubscription();
  const { user, logout } = useAuthContext();

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

    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY, isMobile]);

  // Don't render navbar on /blog page (AFTER all hooks)
  if (location === "/blog") {
    return null;
  }

  const isPanelOpen =
    isMusicPortalOpen || isLocationPanelOpen || mobileMenuOpen;

  const navbarClasses = `bg-white shadow-lg sticky top-[60px] z-40 transition-all duration-300 ${
    isPanelOpen ? "opacity-60 pointer-events-none" : "opacity-100"
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
        className="max-w-full mx-auto px-2 md:px-4"
        style={{ overflow: "visible" }}
      >
        <div className="flex items-center justify-between h-16 gap-2 overflow-visible">
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
                group-hover:opacity-70 
                transition-all duration-500
                pointer-events-none
              "
              />
              <img
                src="https://i.ibb.co/d0PtnHS2/Adobe-Express-file.png"
                alt="Verso Air Logo"
                className="
                  relative h-14 w-auto
                  transition-all duration-500
                  filter grayscale brightness-0
                  group-hover:grayscale-0
                  group-hover:brightness-110
                  group-hover:scale-110
                  group-hover:drop-shadow-[0_0_15px_rgba(234,179,8,0.7)]
                "
              />
            </div>

            <span className="ml-2 text-base md:text-lg font-bold whitespace-nowrap hidden md:inline">
              <AnimatedKeyboardText
                text={isMobile ? "versoair™" : "versoair™"}
                variant="default"
                delay={100}
                className="text-amber-500"
              />
            </span>
          </Link>

          {/* Main Navigation - Desktop */}
          <div className="hidden xl:flex items-center space-x-3 flex-shrink-0">
            <Link
              href="/"
              className="text-gray-600 hover:text-primary transition-colors px-2 py-1 text-sm whitespace-nowrap"
            >
              Home
            </Link>

            <Link
              href="/about"
              className="text-gray-600 hover:text-primary transition-colors px-2 py-1 text-sm whitespace-nowrap"
            >
              About
            </Link>

            {/* 🌍 Geo Admin Portal Link */}
            {isAuthenticated ? (
              <Link
                href="/geo-admin"
                className="text-gray-600 hover:text-primary transition-colors px-2 py-1 text-sm whitespace-nowrap flex items-center"
              >
                <Globe className="mr-1 h-3 w-3" />
                Geo Admin
              </Link>
            ) : (
              <Link
                href="/geo-admin"
                className="text-gray-400 px-2 py-1 text-sm whitespace-nowrap flex items-center gap-1 group relative cursor-pointer"
              >
                <Lock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Geo Admin</span>
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Sign in to access
                </span>
              </Link>
            )}

            {/* Services Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center px-2 py-1 text-sm whitespace-nowrap">
                Services <ChevronDown className="ml-1 h-3 w-3" />
              </button>
              <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg mt-1 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-max">
                <Link
                  href="/services"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  All Services
                </Link>
                <div className="border-t border-gray-200 my-1"></div>
                <Link
                  href="/services/news"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  News & Updates
                </Link>
                <Link
                  href="/services/careers"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Careers
                </Link>
                <Link
                  href="/services/contractors"
                  className="block px-4 py-2 text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Contractors
                </Link>
              </div>
            </div>

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
                    📒 Annuaire
                  </Link>
                </div>
              </div>
            </div>

            <Link
              href="/reservations"
              className="text-gray-600 hover:text-primary transition-colors px-2 py-1 text-sm whitespace-nowrap"
            >
              Reservations
            </Link>

            {/* Assistance Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center px-2 py-1 text-sm whitespace-nowrap">
                Assistance <ChevronDown className="ml-1 h-3 w-3" />
              </button>
              <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg mt-1 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-max">
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

          {/* Tablet Navigation */}
          <div className="hidden md:flex xl:hidden items-center space-x-1 lg:space-x-2 min-w-0 flex-1 justify-center">
            {/* 1. Home — always first */}
            <Link
              href="/"
              className="text-gray-600 hover:text-primary text-xs px-1 whitespace-nowrap"
            >
              Home
            </Link>

            {/* 2. Geo Admin */}
            {isAuthenticated ? (
              <Link
                href="/geo-admin"
                className="text-gray-600 hover:text-primary text-xs px-1 flex items-center whitespace-nowrap"
              >
                <Globe className="mr-1 h-3 w-3" />
                <span className="hidden lg:inline">Geo Admin</span>
              </Link>
            ) : (
              <Link
                href="/geo-admin"
                className="text-gray-400 text-xs px-1 flex items-center gap-1 relative group cursor-pointer whitespace-nowrap"
              >
                <Lock className="h-3 w-3 text-gray-400" />
                <span className="hidden lg:inline text-gray-400">
                  Geo Admin
                </span>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  Sign in to access
                </span>
              </Link>
            )}

            {/* 3. Entreprises Dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center text-xs px-1 whitespace-nowrap">
                Entreprises <ChevronDown className="ml-0.5 h-2.5 w-2.5" />
              </button>
              <div className="absolute top-full left-0 bg-white shadow-lg rounded-lg mt-1 py-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="grid grid-cols-2 gap-x-1">
                  <Link
                    href="/sante"
                    className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Santé
                  </Link>
                  <Link
                    href="/finances"
                    className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Finance
                  </Link>
                  <Link
                    href="/batiment"
                    className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Bâtiment
                  </Link>
                  <Link
                    href="/hotellerie"
                    className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Hôtellerie
                  </Link>
                  <Link
                    href="/automobile"
                    className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Automobile
                  </Link>
                  <Link
                    href="/commerce"
                    className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Commerce
                  </Link>
                  <Link
                    href="/logement"
                    className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    🏠 Logement
                  </Link>
                  <Link
                    href="/divertissement"
                    className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                  >
                    Divertissement
                  </Link>
                  <Link
                    href="/businesses-directory"
                    className="col-span-2 block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 text-center border-t border-gray-100 mt-1 pt-1 font-medium"
                  >
                    📒 Annuaire
                  </Link>
                </div>
              </div>
            </div>

            {/* 4. Services & About — merged dropdown */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center text-xs px-1 whitespace-nowrap">
                Services <ChevronDown className="ml-0.5 h-2.5 w-2.5" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-lg mt-1 py-2 w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  href="/services"
                  className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap font-medium"
                >
                  All Services
                </Link>
                <Link
                  href="/services/news"
                  className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  News & Updates
                </Link>
                <Link
                  href="/services/careers"
                  className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Careers
                </Link>
                <Link
                  href="/services/contractors"
                  className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  Contractors
                </Link>
                <div className="border-t border-gray-200 my-1"></div>
                <Link
                  href="/about"
                  className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap font-medium"
                >
                  About Us
                </Link>
              </div>
            </div>

            {/* 5. Reservation */}
            <Link
              href="/reservations"
              className="text-gray-600 hover:text-primary text-xs px-1 whitespace-nowrap"
            >
              <span className="hidden lg:inline">Reservation</span>
              <span className="lg:hidden">RES</span>
            </Link>

            {/* 6. Support Dropdown (SAV + VersoAI) */}
            <div className="relative group">
              <button className="text-gray-600 hover:text-primary transition-colors flex items-center text-xs px-1 whitespace-nowrap">
                Support <ChevronDown className="ml-0.5 h-2.5 w-2.5" />
              </button>
              <div className="absolute top-full right-0 bg-white shadow-lg rounded-lg mt-1 py-2 w-36 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-max">
                <Link
                  href="/sav"
                  className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  SAV 24/7
                </Link>
                <Link
                  href="/versoai"
                  className="block px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                >
                  VersoAI
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Music Portal Toggle */}
            <Button
              onClick={onMusicPortalToggle}
              className="portal-toggle bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 lg:px-3 py-2 rounded-md text-xs font-medium hover:from-purple-600 hover:to-pink-600 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Music className="h-3 w-3 lg:mr-1" />
              <span className="hidden lg:inline">Verso Air</span>
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

            {/* Search: Loupe icon (tablet md–lg only), original input (lg+) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:block lg:hidden text-gray-600 hover:text-primary p-2 rounded-md transition-colors flex-shrink-0"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <div className="hidden lg:block flex-shrink-0">
              <label className="search relative" htmlFor="inpt_search">
                <input
                  id="inpt_search"
                  type="text"
                  placeholder="Search..."
                  className="w-32 xl:w-36 px-3 py-2 pl-8 pr-3 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all duration-300"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
              </label>
            </div>

            {/* User Actions - Always visible */}
            {user ? (
              <div className="flex items-center gap-1.5">
                {(user.role === "admin" ||
                  user.role === "moderator" ||
                  user.role === "superuser" ||
                  user.isAdmin) && (
                  <Link href="/account/cards" className="flex-shrink-0">
                    <button className="flex items-center gap-1 bg-amber-600 text-white px-2 md:px-3 py-2 rounded-md hover:bg-amber-700 transition-colors text-xs font-medium whitespace-nowrap">
                      <CreditCard className="h-3 w-3" />
                      <span className="hidden lg:inline">Card Vault</span>
                    </button>
                  </Link>
                )}
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="flex-shrink-0 flex items-center gap-1 bg-red-600 text-white px-2 md:px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-xs font-medium whitespace-nowrap"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link href="/auth/signin" className="flex-shrink-0">
                <Button className="bg-primary text-white px-2 md:px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-xs font-medium whitespace-nowrap">
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="sm:hidden">Sign</span>
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

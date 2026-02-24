import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
  Home,
  Store,
  Database,
  Info,
  Wrench,
  Calendar,
  Headphones,
  LogIn,
  Search,
  Globe,
  Lock,
  Building2,
  ShoppingCart,
  Hotel,
  HardHat,
  Car,
  Landmark,
  Gamepad2,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

// Primary Navigation
const primaryNavItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/logement", label: "🏠 Logement", icon: Home },
  { href: "/businesses-directory", label: "Annuaire", icon: Store },
  { href: "/geo-admin", label: "Geo Admin", icon: Globe, requiresAuth: true },
  {
    href: "/geo-admin/immobilier",
    label: "Immobilier",
    icon: Sparkles,
    requiresAuth: true,
  },
];

// Sector pages
const sectorItems = [
  { href: "/commerce", label: "Commerce", icon: ShoppingCart },
  { href: "/hotellerie", label: "Hôtellerie", icon: Hotel },
  { href: "/batiment", label: "Bâtiment", icon: HardHat },
  { href: "/automobile", label: "Automobile", icon: Car },
  { href: "/finances", label: "Finances", icon: Landmark },
  { href: "/divertissement", label: "Loisirs", icon: Gamepad2 },
  { href: "/sante", label: "Santé", icon: Stethoscope },
];

// Additional Services
const servicesItems = [
  { href: "/about", label: "About", icon: Info },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/reservations", label: "Reservations", icon: Calendar },
  { href: "/sav", label: "SAV 24/7", icon: Headphones },
];

// Auth
const authItems = [{ href: "/auth/signin", label: "Sign In", icon: LogIn }];

export function MobileMenuBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated } = useSubscription();

  useEffect(() => {
    // keep body class and notify other components when mobile menu opens/closes
    if (typeof document !== "undefined") {
      if (isOpen) {
        document.body.classList.add("mobile-menu-open");
      } else {
        document.body.classList.remove("mobile-menu-open");
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mobile-menu-toggle", { detail: { open: isOpen } }),
      );
    }

    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("mobile-menu-open");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mobile-menu-toggle", { detail: { open: false } }),
        );
      }
    };
  }, [isOpen]);

  // Don't render the menu on /blog page
  if (location === "/blog") {
    return null;
  }

  const renderMenuSection = (
    items: any[],
    title: string,
    columns: number = 3,
  ) => {
    const gridClass =
      {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
      }[columns] || "grid-cols-3";

    return (
      <div className="mb-4 pb-4 border-b border-gray-200 last:border-b-0 last:mb-2 last:pb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-3">
          {title}
        </p>
        <div className={`grid ${gridClass} gap-2`}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            const isLocked = item.requiresAuth && !isAuthenticated;

            return (
              <Link key={item.href} href={item.href}>
                <button
                  onClick={() => !isLocked && setIsOpen(false)}
                  disabled={isLocked}
                  className={`w-full flex flex-col items-center p-3 rounded-xl transition-all duration-300 touch-manipulation relative ${
                    isLocked
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                      : isActive
                        ? "bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white shadow-md scale-105"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mb-1.5 ${
                      isLocked
                        ? "text-gray-400"
                        : isActive
                          ? "text-white"
                          : "text-[#bf831c]"
                    }`}
                  />
                  <span className="text-xs font-medium text-center">
                    {item.label}
                  </span>
                  {isLocked && (
                    <Lock className="absolute top-1 right-1 h-3 w-3 text-amber-500" />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Menu - Mobile Only */}
      <div className="md:hidden fixed top-8 left-1/2 transform -translate-x-1/2 z-[10003]">
        {/* Menu Toggle Button */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
          size="icon"
        >
          {isOpen ? (
            <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
          ) : (
            <Menu className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
          )}
        </Button>

        {/* Enhanced Mobile Menu */}
        {isOpen && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 py-4 px-3 min-w-[360px] max-w-[400px] max-h-[calc(100vh-140px)] overflow-y-auto animate-in slide-in-from-top-2 duration-300 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {/* Header with Search */}
            <div className="sticky top-0 bg-white/98 -mx-3 px-3 pb-3 backdrop-blur-md z-10">
              <h2 className="text-sm font-bold text-gray-900 mb-3">
                Navigation
              </h2>
              <label className="search relative block" htmlFor="mobile_search">
                <input
                  id="mobile_search"
                  type="text"
                  placeholder="Search..."
                  className="w-full px-4 py-2.5 pl-10 pr-4 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent transition-all duration-300"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </label>
            </div>

            {/* Primary Navigation */}
            {renderMenuSection(primaryNavItems, "Primary Navigation", 3)}

            {/* Sectors */}
            {renderMenuSection(sectorItems, "Entreprises", 3)}

            {/* Services */}
            {renderMenuSection(servicesItems, "Services & Support", 2)}

            {/* Authentication */}
            {renderMenuSection(authItems, "Account", 1)}

            {/* Footer */}
            <div className="text-center pt-3 border-t border-gray-200 sticky bottom-0 bg-white/98 -mx-3 px-3 pb-2 backdrop-blur-md">
              <span className="text-xs text-gray-400">Tap to close menu</span>
            </div>
          </div>
        )}

        {/* Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </>
  );
}

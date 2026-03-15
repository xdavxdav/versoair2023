import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Menu,
  X,
  Home,
  Store,
  Globe,
  Info,
  Headphones,
  ShoppingBag,
  ChevronDown,
  Calendar,
  Lock,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";

interface BlogNavbarProps {
  isAuthenticated?: boolean;
  userName?: string;
  onLogout?: () => void;
  onLogin?: () => void;
}

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/businesses-directory", label: "Annuaire", icon: Store },
  { href: "/geo-admin", label: "Geo Admin", icon: Globe },
  { href: "/about", label: "About", icon: Info },
  { href: "/sav", label: "SAV 24/7", icon: Headphones },
];

export default function BlogNavbar({
  isAuthenticated: isAuthProp,
  userName: userNameProp,
  onLogout: onLogoutProp,
  onLogin,
}: BlogNavbarProps) {
  const { user, logout } = useAuthContext();

  // Check both global auth and marketplace community auth (localStorage)
  const marketplaceAuth =
    localStorage.getItem("blog_community_auth") === "true";
  const marketplaceUser = localStorage.getItem("blog_community_user") || "User";

  const isAuthenticated = isAuthProp ?? (!!user || marketplaceAuth);
  const userName =
    userNameProp ??
    user?.email?.split("@")[0] ??
    (marketplaceAuth ? marketplaceUser : "User");
  const handleLogout = () => {
    if (onLogoutProp) {
      onLogoutProp();
    } else if (user) {
      logout();
    }
    // Also clear marketplace community session
    localStorage.removeItem("blog_community_auth");
    localStorage.removeItem("blog_community_user");
    window.location.reload();
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPath] = useLocation();

  return (
    <>
      <nav className="bg-slate-950/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Logo — Cyan glow on hover, routes to Home */}
            <Link href="/">
              <a className="flex-shrink-0 group relative">
                <div className="absolute -inset-3 bg-cyan-400/0 group-hover:bg-cyan-400/50 rounded-xl blur-xl transition-all duration-500 pointer-events-none" />
                <img
                  src="https://i.ibb.co/d0PtnHS2/Adobe-Express-file.png"
                  alt="Verso"
                  className="relative h-12 w-auto transition-all duration-300 group-hover:scale-105"
                  style={{
                    filter:
                      "brightness(1.1) sepia(1) saturate(5) hue-rotate(155deg)",
                  }}
                />
              </a>
            </Link>

            {/* Desktop Nav Links — neo-cyan, matching main navbar structure */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-1 justify-center">
              {/* Home */}
              <Link href="/">
                <a className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Home className="w-3.5 h-3.5" />
                  Home
                </a>
              </Link>

              {/* About */}
              <Link href="/about">
                <a className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Info className="w-3.5 h-3.5" />
                  About
                </a>
              </Link>

              {/* Geo Admin */}
              <Link href="/geo-admin">
                <a className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Globe className="w-3.5 h-3.5" />
                  Geo Admin
                </a>
              </Link>

              {/* Entreprises Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Store className="w-3.5 h-3.5" />
                  Entreprises <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-cyan-900/20 rounded-xl mt-2 py-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-cyan-500/15">
                  <div className="grid grid-cols-2 gap-0.5 px-1">
                    <Link href="/sante">
                      <a className="block px-3 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        Santé
                      </a>
                    </Link>
                    <Link href="/finances">
                      <a className="block px-3 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        Finance
                      </a>
                    </Link>
                    <Link href="/batiment">
                      <a className="block px-3 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        Bâtiment
                      </a>
                    </Link>
                    <Link href="/hotellerie">
                      <a className="block px-3 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        Hôtellerie
                      </a>
                    </Link>
                    <Link href="/automobile">
                      <a className="block px-3 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        Automobile
                      </a>
                    </Link>
                    <Link href="/commerce">
                      <a className="block px-3 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        Commerce
                      </a>
                    </Link>
                    <Link href="/logement">
                      <a className="block px-3 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        Logement
                      </a>
                    </Link>
                    <Link href="/divertissement">
                      <a className="block px-3 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg transition-colors">
                        Divertissement
                      </a>
                    </Link>
                  </div>
                  <div className="border-t border-cyan-500/10 mt-1.5 pt-1.5 px-1">
                    <Link href="/businesses-directory">
                      <a className="block px-3 py-2 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg text-center font-medium transition-colors">
                        Annuaire
                      </a>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Services Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  Services <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-cyan-900/20 rounded-xl mt-2 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-cyan-500/15">
                  <Link href="/services">
                    <a className="block px-4 py-2 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg mx-1 font-medium transition-colors">
                      All Services
                    </a>
                  </Link>
                  <Link href="/services/news">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      News & Updates
                    </a>
                  </Link>
                  <Link href="/services/careers">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      Careers
                    </a>
                  </Link>
                  <Link href="/services/contractors">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      Contractors
                    </a>
                  </Link>
                </div>
              </div>

              {/* Marketing Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  Marketing <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-cyan-900/20 rounded-xl mt-2 py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-cyan-500/15">
                  <Link href="/marketing">
                    <a className="block px-4 py-2 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg mx-1 font-medium transition-colors">
                      Marketing Hub
                    </a>
                  </Link>
                  <div className="border-t border-cyan-500/10 my-1 mx-2" />
                  <Link href="/marketing/journal">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      Free Ad Journal
                    </a>
                  </Link>
                  <Link href="/marketing/packs">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      Marketing Packs
                    </a>
                  </Link>
                  <Link href="/marketing/print">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      Print Services
                    </a>
                  </Link>
                  <Link href="/marketing/newsletters">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      Newsletter
                    </a>
                  </Link>
                </div>
              </div>

              {/* Reservations */}
              <Link href="/reservations">
                <a className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5" />
                  Reservations
                </a>
              </Link>

              {/* Marketplace */}
              {currentPath !== "/marketplace" && (
                <Link href="/marketplace">
                  <a className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Marketplace
                  </a>
                </Link>
              )}

              {/* Support Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Headphones className="w-3.5 h-3.5" />
                  Support <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full right-0 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-cyan-900/20 rounded-xl mt-2 py-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-cyan-500/15">
                  <Link href="/sav">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      SAV 24/7
                    </a>
                  </Link>
                  <Link href="/versoai">
                    <a className="block px-4 py-2 text-sm text-slate-300 hover:text-cyan-200 hover:bg-cyan-400/10 rounded-lg mx-1 transition-colors">
                      VersoAI
                    </a>
                  </Link>
                </div>
              </div>
            </div>

            {/* Auth + Mobile Toggle */}
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-slate-300">{userName}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              )}

              {/* Mobile Hamburger */}
              <button
                className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-white/10 overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {navLinks
                  .filter(
                    (l) =>
                      !(
                        l.href === "/marketplace" &&
                        currentPath === "/marketplace"
                      ),
                  )
                  .map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}>
                      <a
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4 text-cyan-400" />
                        {label}
                      </a>
                    </Link>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

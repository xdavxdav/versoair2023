import { useState } from "react";
import { motion } from "framer-motion";
import {
  LogOut,
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
  const [currentPath] = useLocation();

  return (
    <>
      <nav className="bg-slate-950/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-1.5">
          <div className="flex items-center justify-between gap-[0.5vw]">
            {/* Logo — Cyan glow on hover, routes to Home */}
            <Link href="/">
              <a className="flex-shrink-0 group relative">
                <div className="absolute -inset-3 bg-cyan-400/0 group-hover:bg-cyan-400/50 rounded-xl blur-xl transition-all duration-500 pointer-events-none" />
                <img
                  src="https://i.ibb.co/d0PtnHS2/Adobe-Express-file.png"
                  alt="Verso"
                  className="relative h-[clamp(1.8rem,4vw,3rem)] w-auto transition-all duration-300 group-hover:scale-105"
                  style={{
                    filter:
                      "brightness(1.1) sepia(1) saturate(5) hue-rotate(155deg)",
                  }}
                />
              </a>
            </Link>

            {/* Nav Links — always visible, viewport-proportional */}
            <div className="flex items-center gap-[0.3vw] flex-1 justify-center min-w-0">
              {/* Home */}
              <Link href="/">
                <a className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Home className="w-[clamp(0.7rem,1.3vw,0.9rem)] h-[clamp(0.7rem,1.3vw,0.9rem)]" />
                  Home
                </a>
              </Link>

              {/* About */}
              <Link href="/about">
                <a className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Info className="w-[clamp(0.7rem,1.3vw,0.9rem)] h-[clamp(0.7rem,1.3vw,0.9rem)]" />
                  About
                </a>
              </Link>

              {/* Geo Admin */}
              <Link href="/geo-admin">
                <a className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Globe className="w-[clamp(0.7rem,1.3vw,0.9rem)] h-[clamp(0.7rem,1.3vw,0.9rem)]" />
                  Geo Admin
                </a>
              </Link>

              {/* Entreprises Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Store className="w-[clamp(0.7rem,1.3vw,0.9rem)] h-[clamp(0.7rem,1.3vw,0.9rem)]" />
                  Entreprises <ChevronDown className="w-[clamp(0.5rem,1vw,0.75rem)] h-[clamp(0.5rem,1vw,0.75rem)]" />
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
                <button className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  Services <ChevronDown className="w-[clamp(0.5rem,1vw,0.75rem)] h-[clamp(0.5rem,1vw,0.75rem)]" />
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
                <button className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  Marketing <ChevronDown className="w-[clamp(0.5rem,1vw,0.75rem)] h-[clamp(0.5rem,1vw,0.75rem)]" />
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
                <a className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Calendar className="w-[clamp(0.7rem,1.3vw,0.9rem)] h-[clamp(0.7rem,1.3vw,0.9rem)]" />
                  Reservations
                </a>
              </Link>

              {/* Marketplace */}
              {currentPath !== "/marketplace" && (
                <Link href="/marketplace">
                  <a className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                    <ShoppingBag className="w-[clamp(0.7rem,1.3vw,0.9rem)] h-[clamp(0.7rem,1.3vw,0.9rem)]" />
                    Marketplace
                  </a>
                </Link>
              )}

              {/* Support Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-[0.3vw] px-[0.5vw] py-[0.4vh] text-[clamp(0.5rem,1.15vw,0.85rem)] text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 rounded-lg transition-all whitespace-nowrap">
                  <Headphones className="w-[clamp(0.7rem,1.3vw,0.9rem)] h-[clamp(0.7rem,1.3vw,0.9rem)]" />
                  Support <ChevronDown className="w-[clamp(0.5rem,1vw,0.75rem)] h-[clamp(0.5rem,1vw,0.75rem)]" />
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

            {/* Auth */}
            <div className="flex items-center gap-[0.5vw] flex-shrink-0">
              {isAuthenticated && (
                <>
                  <div className="flex items-center gap-[0.4vw] px-[0.6vw] py-[0.4vh] bg-white/5 rounded-lg text-[clamp(0.5rem,1.1vw,0.8rem)]">
                    <div className="w-[0.5vw] h-[0.5vw] min-w-[5px] min-h-[5px] bg-green-500 rounded-full" />
                    <span className="text-slate-300 truncate max-w-[8vw]">{userName}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-[0.3vw] px-[0.6vw] py-[0.4vh] bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors text-[clamp(0.5rem,1.1vw,0.8rem)]"
                  >
                    <LogOut className="w-[clamp(0.7rem,1.2vw,1rem)] h-[clamp(0.7rem,1.2vw,1rem)]" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

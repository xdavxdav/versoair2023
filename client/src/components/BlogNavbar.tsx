import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Link } from "wouter";

interface BlogNavbarProps {
  isAuthenticated: boolean;
  userName?: string;
  onLogout?: () => void;
  onLogin?: () => void;
}

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/businesses-directory", label: "Annuaire", icon: Store },
  { href: "/geo-admin", label: "Geo Admin", icon: Globe },
  { href: "/about", label: "About", icon: Info },
  { href: "/sav", label: "SAV 24/7", icon: Headphones },
];

export default function BlogNavbar({
  isAuthenticated,
  userName = "User",
  onLogout,
  onLogin,
}: BlogNavbarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else if (currentScrollY > 50 && currentScrollY > lastScrollY) {
        setIsVisible(false);
        setMobileMenuOpen(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/blog">
              <a className="flex-shrink-0">
                <img
                  src="https://i.ibb.co/d0PtnHS2/Adobe-Express-file.png"
                  alt="Verso"
                  className="h-16 w-auto filter brightness-110"
                />
              </a>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <a className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </a>
                </Link>
              ))}
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
                    onClick={onLogout}
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
                {navLinks.map(({ href, label, icon: Icon }) => (
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
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      onLogout?.();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all mt-1 border-t border-white/10 pt-3"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    Sign Out
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}

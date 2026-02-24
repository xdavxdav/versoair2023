import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, LogOut, LogIn, Home, Link as LinkIcon } from "lucide-react";

interface ScrollableNavbarProps {
  isAuthenticated: boolean;
  userName?: string;
  onLogout?: () => void;
  onLogin?: () => void;
}

export default function ScrollableNavbar({
  isAuthenticated,
  userName = "User",
  onLogout,
  onLogin,
}: ScrollableNavbarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show navbar when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else if (currentScrollY > 50 && currentScrollY > lastScrollY) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const quickLinks = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Blog", icon: LinkIcon, href: "/blog" },
  ];

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}

      {/* Navbar */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <motion.a
              href="/blog"
              className="relative flex items-center group"
              whileHover={{ scale: 1.05 }}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 rounded-lg blur-md opacity-0 group-hover:opacity-60 transition-all duration-300" />
              <img
                src="https://i.ibb.co/d0PtnHS2/Adobe-Express-file.png"
                alt="Verso"
                className="relative h-10 w-auto transition-all duration-300 filter group-hover:brightness-125 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]"
              />
            </motion.a>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-slate-300">{userName}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onLogin}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
                  >
                    Sign Up
                  </motion.button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-300 hover:text-cyan-400 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </motion.button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mt-4 pt-4 border-t border-white/10 space-y-2"
            >
              <div className="border-t border-white/10 pt-3 space-y-2">
                {isAuthenticated ? (
                  <>
                    <div className="px-3 py-2 text-sm text-slate-300">
                      Logged in as {userName}
                    </div>
                    <motion.button
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      onClick={onLogin}
                      className="w-full px-3 py-2 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors text-sm"
                    >
                      Sign In
                    </motion.button>
                    <motion.button className="w-full px-3 py-2 bg-cyan-500 text-white hover:bg-cyan-600 transition-colors text-sm font-medium">
                      Sign Up
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>

      {/* Floating Quick Links Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isQuickLinksOpen ? 1 : 0,
          scale: isQuickLinksOpen ? 1 : 0.8,
          pointerEvents: isQuickLinksOpen ? "auto" : "none",
        }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="bg-slate-900/98 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-4 w-56">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-cyan-400" />
              Quick Links
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsQuickLinksOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Links */}
          <div className="space-y-2">
            {quickLinks.map(({ label, icon: Icon, href }) => (
              <motion.a
                key={label}
                href={href}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors text-sm"
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.a>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Quick Links Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsQuickLinksOpen(!isQuickLinksOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        animate={{
          opacity: isQuickLinksOpen ? 0 : 1,
          pointerEvents: isQuickLinksOpen ? "none" : "auto",
        }}
      >
        <LinkIcon className="w-6 h-6" />
      </motion.button>
    </>
  );
}

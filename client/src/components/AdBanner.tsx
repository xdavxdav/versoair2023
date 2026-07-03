import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface AdBannerProps {
  onClose?: () => void;
}

export default function AdBanner({ onClose }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide banner when scrolling down, show when scrolling up
      if (currentScrollY < lastScrollY) {
        setIsBannerVisible(true);
      } else if (currentScrollY > 50 && currentScrollY > lastScrollY) {
        setIsBannerVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: isBannerVisible ? 1 : 0,
        y: isBannerVisible ? 0 : -100,
      }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <p className="text-white font-bold text-sm sm:text-base font-handstyle">
              ✨ Join Verso Social Today! Build Your Network & Grow Your
              Business
            </p>
            <p className="text-white/80 text-xs sm:text-sm font-handstyle hidden sm:block">
              Connect with industry professionals, showcase expertise, and
              access exclusive opportunities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-3 sm:px-4 py-2 bg-white text-orange-600 font-bold text-sm rounded-lg hover:bg-white/90 transition-colors font-handstyle whitespace-nowrap"
          >
            Learn More
          </motion.button>

          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

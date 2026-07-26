import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button after scrolling down 300px (past navbar)
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0, y: 20 }}
          whileHover={{ scale: 1.15, y: -8 }}
          whileTap={{ scale: 0.85 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-[9999] w-16 h-16 bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 text-white rounded-full transition-all duration-300 flex flex-col items-center justify-center group border-2 border-emerald-400/40 backdrop-blur-md hover:backdrop-blur-lg hover:from-emerald-500/40 hover:to-emerald-600/40 hover:border-emerald-300/60"
          style={{
            boxShadow:
              "0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.1)",
          }}
          aria-label="Scroll to top"
        >
          {/* Pulsing glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/40 to-emerald-500/40"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Arrow pointing up */}
          <ArrowUp
            className="relative z-10 w-7 h-7 group-hover:w-8 group-hover:h-8 transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            strokeWidth={3}
          />

          {/* Eagle emoji below arrow */}
          <span className="relative z-10 text-lg group-hover:text-xl transition-all duration-300 -mt-1 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]">
            🦅
          </span>

          {/* Additional glow on hover */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-300/0 to-emerald-400/0 group-hover:from-emerald-300/30 group-hover:to-emerald-400/30 transition-all duration-300"></div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

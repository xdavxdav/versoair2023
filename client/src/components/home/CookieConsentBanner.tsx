import { motion } from "framer-motion";
import { Cookie } from "lucide-react";

type CookieConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
};

export const CookieConsentBanner = ({
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
      <div className="max-w-[95vw] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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

export default CookieConsentBanner;

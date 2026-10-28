import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Cookie } from "lucide-react";

type CookieConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
  errorMessage?: string;
};

export const CookieConsentBanner = ({
  onAccept,
  onDecline,
  errorMessage,
}: CookieConsentBannerProps) => {
  const bannerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;

    const root = document.documentElement;
    const updateHeight = () => {
      root.style.setProperty(
        "--cookie-banner-height",
        `${Math.ceil(banner.getBoundingClientRect().height)}px`,
      );
    };
    updateHeight();
    root.dataset.cookieConsentVisible = "true";

    const observer = new ResizeObserver(updateHeight);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      delete root.dataset.cookieConsentVisible;
      root.style.removeProperty("--cookie-banner-height");
    };
  }, []);

  return (
    <motion.div
      ref={bannerRef}
      data-cookie-consent-banner
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-blue-500/30 bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-2.5 text-white shadow-2xl sm:p-4 md:p-6"
    >
      <div className="mx-auto flex max-w-[95vw] flex-col items-center justify-between gap-2 sm:flex-row sm:gap-4">
        <div className="flex min-w-0 items-start gap-2 sm:gap-4">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-blue-400 sm:h-6 sm:w-6 md:h-8 md:w-8" />
          <div className="min-w-0">
            <h3 className="mb-0.5 text-sm font-bold sm:mb-1 sm:text-base md:mb-2 md:text-lg">
              🍪 Cookie Preferences
            </h3>
            <p className="text-[11px] leading-snug text-gray-300 sm:text-xs md:text-sm">
              Essential cookies keep the site working. Optional analytics and
              marketing trackers run only if you accept.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onDecline}
              className="min-h-11 rounded-lg border border-gray-400 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-800/50 sm:px-4 md:px-6 md:text-sm"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              className="min-h-11 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 text-xs font-bold shadow-lg transition-all hover:from-blue-600 hover:to-blue-700 sm:px-4 md:px-6 md:text-sm"
            >
              Accept All
            </button>
          </div>
          {errorMessage && (
            <p role="alert" className="max-w-xs text-xs text-red-200">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CookieConsentBanner;

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CookieConsentBanner } from "@/components/home/CookieConsentBanner";
import { getCookieConsent, saveCookieConsent } from "@/lib/cookie-consent";

export function CookieConsentManager() {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getCookieConsent()) return;

    const timer = window.setTimeout(() => setVisible(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  const choose = (consent: "accepted" | "declined") => {
    setError("");
    try {
      saveCookieConsent(consent);
      setVisible(false);
    } catch (cause) {
      console.error("[Cookie consent] Could not save preference:", cause);
      setError(
        "Your choice could not be saved. Please enable browser storage and try again.",
      );
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <CookieConsentBanner
          onAccept={() => choose("accepted")}
          onDecline={() => choose("declined")}
          errorMessage={error}
        />
      )}
    </AnimatePresence>
  );
}

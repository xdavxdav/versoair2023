/**
 * Redirects /artist-portal to the music app (SIBLING_URL)
 * Prevents users from hitting the 404 catch-all
 */
import { useEffect } from "react";
import { PageLoader } from "./ui/app-loader";

export default function ArtistPortalRedirect() {
  useEffect(() => {
    // Get the sibling URL from the injected config
    const config = (window as any).__APP_CONFIG__;
    const siblingUrl = config?.siblingUrl || "http://localhost:5004";

    // Ensure clean URL — no double slashes
    const cleanUrl = siblingUrl.replace(/\/$/, "");
    const redirectUrl = `${cleanUrl}/artist-portal`;

    // Redirect immediately
    window.location.href = redirectUrl;
  }, []);

  return <PageLoader />;
}

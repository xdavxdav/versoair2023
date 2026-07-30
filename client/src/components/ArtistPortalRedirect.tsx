/**
 * Direct navigation to artist portal on music app
 * Sends user straight to /artist-portal without showing UI
 */
import { useEffect } from "react";

export default function ArtistPortalRedirect() {
  useEffect(() => {
    // Get the sibling URL from the injected config
    const config = (window as any).__APP_CONFIG__;
    const siblingUrl = config?.siblingUrl || "http://localhost:5004";

    // Ensure clean URL — no double slashes
    const cleanUrl = siblingUrl.replace(/\/$/, "");
    const targetUrl = `${cleanUrl}/artist-portal`;

    // Direct navigation immediately - no UI shown
    window.location.href = targetUrl;
  }, []);

  return null;
}

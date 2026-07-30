/**
 * Direct navigation to artist portal on music app
 * Sends user straight to /artist-portal without showing UI
 */
import { useEffect } from "react";

export default function ArtistPortalRedirect() {
  useEffect(() => {
    // Get the sibling URL from the injected config; on production the server
    // injects the real URL. Fall back to the current origin (never localhost)
    // so users never get sent off-domain.
    const config = (window as any).__APP_CONFIG__;
    const siblingUrl = config?.siblingUrl || window.location.origin;

    // Ensure clean URL — no double slashes
    const cleanUrl = siblingUrl.replace(/\/$/, "");
    const targetUrl = `${cleanUrl}/artist-portal`;

    // Direct navigation immediately - no UI shown
    window.location.href = targetUrl;
  }, []);

  return null;
}

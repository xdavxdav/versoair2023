export const DEFAULT_SITE_ORIGIN = "https://www.versoair.com";

// Render injects RENDER_EXTERNAL_URL (the *.onrender.com origin); it must never
// be used for public SEO URLs, so it is intentionally not a candidate here.
const CANDIDATE_ENV_VARS = [
  "PRODUCTION_URL",
  "APP_PUBLIC_URL",
  "VERSOAIR_URL",
] as const;

function normalizeOrigin(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  if (host.endsWith(".onrender.com") || host === "your-domain.com") return null;

  // The canonical host is www; the apex only 301-redirects to it.
  if (host === "versoair.com") url.hostname = "www.versoair.com";

  return url.origin;
}

export function getSiteOrigin(): string {
  for (const name of CANDIDATE_ENV_VARS) {
    const raw = process.env[name];
    if (!raw) continue;
    const origin = normalizeOrigin(raw);
    if (origin) return origin;
  }
  return DEFAULT_SITE_ORIGIN;
}

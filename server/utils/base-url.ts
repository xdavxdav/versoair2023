import { DEFAULT_SITE_ORIGIN } from "./site-origin";

// PUBLIC_BASE_URL is the explicit override. The others are the repo's existing
// public-origin variables (see site-origin.ts) so production needs no new config.
const ENV_CANDIDATES = [
  "PUBLIC_BASE_URL",
  "PRODUCTION_URL",
  "APP_PUBLIC_URL",
  "VERSOAIR_URL",
] as const;

const DEFAULT_DEV_PORT = 5003;

function isLoopbackHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "[::1]" ||
    host === "0.0.0.0" ||
    /^127\./.test(host)
  );
}

function isNonPublicHost(host: string): boolean {
  return (
    isLoopbackHost(host) ||
    host.endsWith(".onrender.com") ||
    host === "your-domain.com"
  );
}

// Credentials, query and fragment are dropped and trailing slashes stripped so
// callers can append "/path?query" safely.
function normalizeBaseUrl(raw: string | undefined, production: boolean) {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (production && isNonPublicHost(url.hostname.toLowerCase())) return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

/**
 * Public origin used for URLs that leave the site (Stripe return URLs, emails).
 * It is derived from configuration only, never from request headers, so a
 * forged Origin or Host header cannot redirect a customer elsewhere.
 */
export function getPublicBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const production = env.NODE_ENV === "production";
  for (const name of ENV_CANDIDATES) {
    const base = normalizeBaseUrl(env[name], production);
    if (base) return base;
  }
  if (production) return DEFAULT_SITE_ORIGIN;

  const port = Number(env.PORT);
  const devPort =
    Number.isInteger(port) && port > 0 && port < 65536
      ? port
      : DEFAULT_DEV_PORT;
  return `http://localhost:${devPort}`;
}

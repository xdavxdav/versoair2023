import { useEffect, useState } from "react";
import { SECTOR_CONFIGS } from "@/components/sector-directory/sector-configs";
import { getFicheSectorPalette } from "@/lib/fiche-sector-theme";

export type FooterTheme = {
  accent: string;
  accentDark: string;
  tone?: "refined" | "playful";
};

// Shared palette families used across non-sector pages.
const PALETTES = {
  // Sky / Blue — /businesses-directory, /category/*, /reservations, /services/careers, /versoai, /faq, /sponsor
  sky: { accent: "#0369A1", accentDark: "#38BDF8" },
  blue: { accent: "#1D4ED8", accentDark: "#60A5FA" },
  // Cyan / Teal — /logement, /blog, /marketplace, /geo-admin/immobilier, /contracts
  cyan: { accent: "#0E7490", accentDark: "#22D3EE" },
  teal: { accent: "#0F766E", accentDark: "#2DD4BF" },
  // Indigo — /sav, /geo-admin/business-verification, /ad-campaigns, /account/cards, /admin/database
  indigo: { accent: "#4338CA", accentDark: "#818CF8" },
  // Violet / Purple — /art-and-artisanat, /profiles/*, /artistes, /sessions*, /marketing/newsletters, /account/paypal
  violet: { accent: "#6D28D9", accentDark: "#A78BFA" },
  purple: { accent: "#7C3AED", accentDark: "#C084FC" },
  // Emerald / Green — /admin/streamroyale, /marketing/print, /community
  emerald: { accent: "#059669", accentDark: "#34D399" },
  green: { accent: "#15803D", accentDark: "#4ADE80" },
  // Crimson / Red — /import-business
  crimson: { accent: "#DC2626", accentDark: "#F87171" },
} satisfies Record<string, FooterTheme>;

// Dark-mode counterparts for fiche-sector-theme.ts slugs (used on /business/:id and /category/:slug).
const FICHE_DARK_ACCENTS = new Map<string, string>([
  ["commerce", "#60a5fa"],
  ["building-construction", "#fbbf24"],
  ["automotive-motorbike", "#94a3b8"],
  ["tourism-leisure", "#c084fc"],
  ["finance", "#34d399"],
  ["entertainment-sports", "#f472b6"],
  ["health", "#f87171"],
  ["real-estate", "#2dd4bf"],
  ["food-beverage", "#fb923c"],
  ["education-training", "#818cf8"],
]);

// Exact-path themes. Standard warm cream/amber pages (/, /services, /pricing, /about,
// /contact, /help*, /privacy, /terms, etc.) intentionally return null so they keep
// the default warm cream/amber Verso Air house footer.
const EXACT_ROUTE_THEMES = new Map<string, FooterTheme>([
  // 1. All 7 SectorDirectory routes — strictly synced with SECTOR_CONFIGS
  ...Object.entries(SECTOR_CONFIGS).map(
    ([slug, cfg]) =>
      [
        `/${slug}`,
        {
          accent: cfg.accent,
          accentDark: cfg.accentDark,
          tone: cfg.tone,
        },
      ] as const,
  ),

  // 2. Directories, Real Estate & Booking
  ["/businesses-directory", PALETTES.sky],
  ["/logement", PALETTES.cyan],
  ["/reservations", PALETTES.blue],
  ["/geo-admin/immobilier", PALETTES.teal],

  // 3. Community, Feed, Marketplace & Support
  ["/blog", PALETTES.cyan],
  ["/marketplace", PALETTES.cyan],
  ["/faq", PALETTES.sky],
  ["/community", PALETTES.emerald],
  ["/sav", PALETTES.indigo],
  ["/versoai", PALETTES.sky],
  ["/services/careers", PALETTES.sky],

  // 4. Cultural, Artist & Studio Pages (outside music-shell routes)
  ["/art-and-artisanat", PALETTES.violet],
  ["/artistes", PALETTES.purple],
  ["/sessions", PALETTES.purple],
  ["/my-live-sessions", PALETTES.purple],
  ["/apply/profile", PALETTES.purple],
  ["/id-guide", PALETTES.purple],
  ["/revenue-pulse", PALETTES.purple],

  // 5. Marketing, Billing, Admin & Tools with distinct non-amber palettes
  ["/marketing/print", PALETTES.green],
  ["/marketing/newsletters", PALETTES.purple],
  ["/account/paypal", PALETTES.purple],
  ["/account/cards", PALETTES.indigo],
  ["/ad-campaigns", PALETTES.indigo],
  ["/geo-admin/business-verification", PALETTES.indigo],
  ["/admin/database", PALETTES.indigo],
  ["/admin/streamroyale", PALETTES.emerald],
  ["/admin/streamroyale/review", PALETTES.purple],
  ["/admin/purgatoire", PALETTES.purple],
  ["/admin/contracts", PALETTES.purple],
  ["/admin/profile-requests", PALETTES.purple],
  ["/contracts", PALETTES.teal],
  ["/import-business", PALETTES.crimson],
  ["/sponsor", PALETTES.blue],
]);

// Dynamic-segment route prefixes (/profiles/:slug, /category/:slug, /sessions/:id, etc.)
const PREFIX_ROUTE_THEMES: ReadonlyArray<readonly [string, FooterTheme]> = [
  ["/profiles/", PALETTES.violet],
  ["/artist-catalogue/", PALETTES.purple],
  ["/artistes/", PALETTES.purple],
  ["/sessions/", PALETTES.purple],
];

function normalizePath(pathname: string): string {
  const clean = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "").toLowerCase();
  return clean || "/";
}

/**
 * Resolves a fiche sector slug (e.g. from `biz.sector_slug` on `/business/:id`
 * or `/category/:slug`) into a matching FooterTheme.
 */
export function getFooterThemeForSectorSlug(
  sectorSlug: string | null | undefined,
): FooterTheme | null {
  if (!sectorSlug) return null;
  const slug = sectorSlug.trim().toLowerCase();
  const darkAccent = FICHE_DARK_ACCENTS.get(slug);
  if (!darkAccent) return null;
  const palette = getFicheSectorPalette(slug);
  return {
    accent: palette.accent,
    accentDark: darkAccent,
    tone: slug === "entertainment-sports" ? "playful" : "refined",
  };
}

export function getFooterTheme(pathname: string): FooterTheme | null {
  const normalized = normalizePath(pathname);

  const exact = EXACT_ROUTE_THEMES.get(normalized);
  if (exact) return exact;

  // /category/:slug — match known sector slugs directly if present, otherwise blue directory palette
  if (normalized.startsWith("/category/") && normalized.length > "/category/".length) {
    const slug = normalized.slice("/category/".length).split("/", 1)[0];
    return getFooterThemeForSectorSlug(slug) ?? PALETTES.blue;
  }

  for (const [prefix, theme] of PREFIX_ROUTE_THEMES) {
    if (normalized.startsWith(prefix) && normalized.length > prefix.length) {
      return theme;
    }
  }

  return null;
}

/* ── Lightweight dynamic override for data-driven pages (e.g. /business/:id) ── */

type Listener = () => void;
let currentOverride: { pathname: string; theme: FooterTheme } | null = null;
const listeners = new Set<Listener>();

export function setDynamicFooterTheme(
  pathname: string,
  theme: FooterTheme | null,
): void {
  const normalized = normalizePath(pathname);
  const next = theme ? { pathname: normalized, theme } : null;
  if (
    currentOverride?.pathname === next?.pathname &&
    currentOverride?.theme.accent === next?.theme.accent &&
    currentOverride?.theme.accentDark === next?.theme.accentDark
  ) {
    return;
  }
  currentOverride = next;
  listeners.forEach((fn) => fn());
}

export function useResolvedFooterTheme(pathname: string): FooterTheme | null {
  const [, bump] = useState(0);

  useEffect(() => {
    const onChange = () => bump((n) => n + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const normalized = normalizePath(pathname);
  if (currentOverride && currentOverride.pathname === normalized) {
    return currentOverride.theme;
  }
  return getFooterTheme(normalized);
}

export interface FooterTheme {
  tone: "playful";
  accent: string;
  accentDark: string;
}

// The footer ships in the main bundle while the sector configs are lazy-loaded
// with the sector pages, so the accents are repeated here. footer-theme.test.ts
// fails if they drift from SECTOR_CONFIGS.
const FOOTER_THEMES = new Map<string, FooterTheme>([
  ["/divertissement", { tone: "playful", accent: "#E0409A", accentDark: "#FF86C4" }],
]);

// Mirrors how the router matches a path: case-insensitive, optional trailing slash.
function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return path.toLowerCase() || "/";
}

export function getFooterTheme(pathname: string): FooterTheme | null {
  return FOOTER_THEMES.get(normalizePath(pathname)) ?? null;
}

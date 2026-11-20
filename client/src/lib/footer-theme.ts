export interface FooterTheme {
  tone: "playful";
  accent: string;
  accentDark: string;
}

// One footer colour for every page, taken from the pink theme of the
// entertainment directory (SECTOR_CONFIGS.divertissement). The footer ships in
// the main bundle while the sector configs are lazy-loaded, so the accents are
// repeated here; footer-theme.test.ts fails if they drift.
export const FOOTER_THEME: FooterTheme = {
  tone: "playful",
  accent: "#E0409A",
  accentDark: "#FF86C4",
};

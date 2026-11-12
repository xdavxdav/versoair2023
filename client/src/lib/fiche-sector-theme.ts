import type { CSSProperties } from "react";

export type FicheSectorPalette = {
  accent: string;
  soft: string;
  border: string;
};

export type FicheSectorStyle = CSSProperties &
  Record<`--fiche-${string}`, string>;

// Neutral default for sectors without a colour yet. gray-600 matches the
// INDUSTRY_PROFILES default, so unmapped sectors match the rest of the site.
const HOUSE_PALETTE: FicheSectorPalette = {
  accent: "#4b5563",
  soft: "#f9fafb",
  border: "#e5e7eb",
};

// Keyed by main-category slug (the sector), never by sub-category.
// Accents are the INDUSTRY_PROFILES sector colours. Where the -600 shade falls
// below 4.5:1 on white or on its tint, the -700 shade of the same hue is used.
const SECTOR_PALETTES = new Map<string, FicheSectorPalette>([
  ["commerce", { accent: "#2563eb", soft: "#eff6ff", border: "#bfdbfe" }],
  [
    "building-construction",
    { accent: "#b45309", soft: "#fffbeb", border: "#fde68a" },
  ],
  [
    "automotive-motorbike",
    { accent: "#334155", soft: "#f8fafc", border: "#e2e8f0" },
  ],
  [
    "tourism-leisure",
    { accent: "#9333ea", soft: "#faf5ff", border: "#e9d5ff" },
  ],
  ["finance", { accent: "#047857", soft: "#ecfdf5", border: "#a7f3d0" }],
  [
    "entertainment-sports",
    { accent: "#be185d", soft: "#fdf2f8", border: "#fbcfe8" },
  ],
  ["health", { accent: "#b91c1c", soft: "#fef2f2", border: "#fecaca" }],
  ["real-estate", { accent: "#0f766e", soft: "#f0fdfa", border: "#99f6e4" }],
  ["food-beverage", { accent: "#c2410c", soft: "#fff7ed", border: "#fed7aa" }],
  [
    "education-training",
    { accent: "#4f46e5", soft: "#eef2ff", border: "#c7d2fe" },
  ],
]);

export function getFicheSectorPalette(
  slug: string | null | undefined,
): FicheSectorPalette {
  return (slug && SECTOR_PALETTES.get(slug)) || HOUSE_PALETTE;
}

export function ficheSectorStyle(
  palette: FicheSectorPalette,
): FicheSectorStyle {
  return {
    "--fiche-accent": palette.accent,
    "--fiche-soft": palette.soft,
    "--fiche-border": palette.border,
  };
}

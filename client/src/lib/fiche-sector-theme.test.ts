import assert from "node:assert/strict";
import test from "node:test";
import { ficheSectorStyle, getFicheSectorPalette } from "./fiche-sector-theme";

const HOUSE_ACCENT = "#4b5563";

const SECTOR_ACCENTS: Record<string, string> = {
  commerce: "#2563eb",
  "building-construction": "#b45309",
  "automotive-motorbike": "#334155",
  "tourism-leisure": "#9333ea",
  finance: "#047857",
  "entertainment-sports": "#be185d",
  health: "#b91c1c",
  "real-estate": "#0f766e",
  "food-beverage": "#c2410c",
  "education-training": "#4f46e5",
};

const SECTOR_SLUGS = Object.keys(SECTOR_ACCENTS);

function luminance(hex: string): number {
  const channel = (start: number) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("each sector slug maps to its accent", () => {
  for (const [slug, accent] of Object.entries(SECTOR_ACCENTS)) {
    assert.equal(getFicheSectorPalette(slug).accent, accent, slug);
  }
});

test("missing or unknown sectors fall back to the house palette", () => {
  for (const slug of [
    null,
    undefined,
    "",
    "unknown-sector",
    "constructor",
    "__proto__",
  ]) {
    assert.equal(
      getFicheSectorPalette(slug).accent,
      HOUSE_ACCENT,
      String(slug),
    );
  }
});

test("sector accents are distinct from each other and from the house accent", () => {
  const accents = SECTOR_SLUGS.map(
    (slug) => getFicheSectorPalette(slug).accent,
  );
  assert.equal(new Set(accents).size, SECTOR_SLUGS.length);
  assert.ok(!accents.includes(HOUSE_ACCENT));
});

test("every palette keeps its accent readable on white and on its tint", () => {
  for (const slug of [...SECTOR_SLUGS, null]) {
    const { accent, soft } = getFicheSectorPalette(slug);
    assert.ok(contrast(accent, "#ffffff") >= 4.5, `${slug} on white`);
    assert.ok(contrast(accent, soft) >= 4.5, `${slug} on soft`);
  }
});

test("palette values are six-digit hex colours", () => {
  for (const slug of [...SECTOR_SLUGS, null]) {
    for (const value of Object.values(getFicheSectorPalette(slug))) {
      assert.match(value, /^#[0-9a-f]{6}$/i);
    }
  }
});

test("the style exposes the palette as fiche CSS custom properties", () => {
  assert.deepEqual(ficheSectorStyle(getFicheSectorPalette("health")), {
    "--fiche-accent": "#b91c1c",
    "--fiche-soft": "#fef2f2",
    "--fiche-border": "#fecaca",
  });
});

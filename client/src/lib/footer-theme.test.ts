import assert from "node:assert/strict";
import test from "node:test";
import { SECTOR_CONFIGS } from "../components/sector-directory/sector-configs";
import {
  getFooterTheme,
  getFooterThemeForSectorSlug,
  setDynamicFooterTheme,
} from "./footer-theme";

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

function mixHex(c1: string, weightPercent: number, c2: string): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const w = weightPercent / 100;
  const ch = (a: number, b: number) =>
    Math.max(0, Math.min(255, Math.round(a * w + b * (1 - w))))
      .toString(16)
      .padStart(2, "0");
  return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
}

test("all 7 sector directory pages match their exact SECTOR_CONFIGS accent colors", () => {
  for (const [key, config] of Object.entries(SECTOR_CONFIGS)) {
    const theme = getFooterTheme(`/${key}`);
    assert.ok(theme, `${key} should resolve a footer theme`);
    assert.equal(theme.accent, config.accent, `${key} accent`);
    assert.equal(theme.accentDark, config.accentDark, `${key} accentDark`);
    assert.equal(theme.tone, config.tone, `${key} tone`);
  }
});

test("matching ignores case, trailing slashes, query strings and hashes", () => {
  for (const path of [
    "/Divertissement",
    "/divertissement/",
    "/divertissement?city=Toronto",
    "/divertissement#top",
  ]) {
    assert.equal(getFooterTheme(path)?.tone, "playful", path);
  }
  assert.equal(
    getFooterTheme("/Hotellerie/?city=Montreal")?.accent,
    SECTOR_CONFIGS.hotellerie.accent,
  );
});

test("non-sector themed routes match their page palette", () => {
  assert.equal(getFooterTheme("/businesses-directory")?.accent, "#0369A1");
  assert.equal(getFooterTheme("/logement")?.accent, "#0E7490");
  assert.equal(getFooterTheme("/blog")?.accent, "#0E7490");
  assert.equal(getFooterTheme("/marketplace")?.accent, "#0E7490");
  assert.equal(getFooterTheme("/art-and-artisanat")?.accent, "#6D28D9");
  assert.equal(getFooterTheme("/profiles/atelier-nord")?.accent, "#6D28D9");
  assert.equal(getFooterTheme("/artistes")?.accent, "#7C3AED");
  assert.equal(getFooterTheme("/sessions/42")?.accent, "#7C3AED");
  assert.equal(getFooterTheme("/services/careers")?.accent, "#0369A1");
  assert.equal(getFooterTheme("/marketing/print")?.accent, "#15803D");
  assert.equal(getFooterTheme("/category/commerce")?.accent, "#2563eb");
  assert.equal(getFooterTheme("/category/custom-sub")?.accent, "#1D4ED8");
});

test("business detail sector slugs resolve matching footer palettes (e.g. commerce = blue)", () => {
  const commerce = getFooterThemeForSectorSlug("commerce");
  assert.equal(commerce?.accent, "#2563eb");
  assert.equal(commerce?.accentDark, "#60a5fa");

  const finance = getFooterThemeForSectorSlug("finance");
  assert.equal(finance?.accent, "#047857");

  const entertainment = getFooterThemeForSectorSlug("entertainment-sports");
  assert.equal(entertainment?.tone, "playful");

  assert.equal(getFooterThemeForSectorSlug("unknown"), null);
  assert.equal(getFooterThemeForSectorSlug(null), null);

  // Clean up dynamic override smoke check
  setDynamicFooterTheme("/business/123", commerce);
  setDynamicFooterTheme("/business/123", null);
});

test("warm cream/amber house pages keep the default footer (null)", () => {
  for (const path of [
    "/",
    "",
    "/services",
    "/services/contractors",
    "/pricing",
    "/about",
    "/contact",
    "/help",
    "/help/account",
    "/privacy",
    "/terms",
    "/events",
    "/events/summer-gala",
    "/artisans",
    "/geo-admin",
    "/tickets",
    "/divertissement/extra",
    "/constructor",
    "/__proto__",
  ]) {
    assert.equal(getFooterTheme(path), null, path);
  }
});

test("every themed footer accent maintains >= 4.5:1 ink contrast on its light and dark surfaces", () => {
  const sampleRoutes = [
    ...Object.keys(SECTOR_CONFIGS).map((k) => `/${k}`),
    "/businesses-directory",
    "/logement",
    "/reservations",
    "/geo-admin/immobilier",
    "/faq",
    "/community",
    "/sav",
    "/art-and-artisanat",
    "/artistes",
    "/marketing/print",
    "/import-business",
    "/category/commerce",
    "/category/health",
    "/category/tourism-leisure",
  ];

  for (const route of sampleRoutes) {
    const theme = getFooterTheme(route);
    assert.ok(theme, `${route} must resolve a theme`);
    const lightSurface =
      theme.tone === "playful" ? "#ffe8f4" : mixHex(theme.accent, 11, "#ffffff");
    const lightInk = mixHex(theme.accent, 68, "#000000");
    assert.ok(
      contrast(lightInk, lightSurface) >= 4.5,
      `${route} light ink contrast failed`,
    );

    const darkSurface =
      theme.tone === "playful"
        ? "#231629"
        : mixHex(theme.accentDark, 13, "#0e1017");
    const darkInk = mixHex(theme.accentDark, 62, "#ffffff");
    assert.ok(
      contrast(darkInk, darkSurface) >= 4.5,
      `${route} dark ink contrast failed`,
    );
  }
});

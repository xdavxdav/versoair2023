import { AFRICA_GENRES } from "./data-africa";
import { AMERICAS_GENRES } from "./data-americas";
import { ASIA_GENRES } from "./data-asia";
import { EUROPE_GENRES } from "./data-europe";
import { FAMILY_GENRES } from "./families";
import type { GenreSeed } from "./types";

export type { GenreSeed, GenreSource } from "./types";

export const MUSIC_GENRES: readonly GenreSeed[] = [
  ...FAMILY_GENRES,
  ...AMERICAS_GENRES,
  ...EUROPE_GENRES,
  ...AFRICA_GENRES,
  ...ASIA_GENRES,
];

export const normalizeGenreText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const bySlug = new Map(MUSIC_GENRES.map((g) => [g.slug, g]));
const byText = new Map<string, GenreSeed>();
for (const g of MUSIC_GENRES) {
  byText.set(normalizeGenreText(g.name), g);
}
for (const g of MUSIC_GENRES) {
  for (const alias of g.aliases) {
    const key = normalizeGenreText(alias);
    if (!byText.has(key)) byText.set(key, g);
  }
}

export function findGenre(input: string): GenreSeed | undefined {
  return byText.get(normalizeGenreText(input));
}

/** Canonical genre name for free text (alias-aware); unknown text is returned trimmed. */
export function canonicalGenreName(input: string): string {
  return findGenre(input)?.name ?? input.trim();
}

function descendants(root: GenreSeed): GenreSeed[] {
  const out = [root];
  for (let i = 0; i < out.length; i += 1) {
    for (const g of MUSIC_GENRES) {
      if (g.parent === out[i].slug && !out.includes(g)) out.push(g);
    }
  }
  return out;
}

/**
 * One matching rule for every genre filter: case-insensitive exact match on the
 * genre name, its aliases and its sub-styles. Compare with `LOWER(BTRIM(column))`.
 * Unknown text matches only itself.
 */
export function genreFilterValues(input: string): string[] {
  const raw = input.trim().toLowerCase();
  if (!raw) return [];
  const genre = findGenre(input);
  if (!genre) return [raw];
  const values = new Set<string>([raw]);
  for (const g of descendants(genre)) {
    values.add(g.name.toLowerCase());
    for (const a of g.aliases) values.add(a.toLowerCase());
  }
  return [...values];
}

export interface GenreOption {
  slug: string;
  name: string;
  kind: "family" | "style";
  parent: string | null;
  countries: readonly string[];
}

export function listGenres(country?: string): GenreOption[] {
  const cc = country?.trim().toUpperCase();
  let picked: readonly GenreSeed[] = MUSIC_GENRES;
  if (cc) {
    const slugs = new Set<string>();
    for (const g of MUSIC_GENRES) {
      if (!g.countries.includes(cc) && !(g.kind === "family" && g.countries.length === 0)) continue;
      for (let cur: GenreSeed | undefined = g; cur && !slugs.has(cur.slug); cur = cur.parent ? bySlug.get(cur.parent) : undefined) {
        slugs.add(cur.slug);
      }
    }
    picked = MUSIC_GENRES.filter((g) => slugs.has(g.slug));
  }
  return picked
    .map(({ slug, name, kind, parent, countries }) => ({ slug, name, kind, parent, countries }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const getGenreBySlug = (slug: string) => bySlug.get(slug);

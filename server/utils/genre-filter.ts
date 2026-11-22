import { genreFilterValues } from "../../shared/music-genres";

export interface GenreCondition {
  sql: string;
  params: string[][];
}

/** Text column (e.g. mt.genre, a.genre): exact match on genre, aliases and sub-styles. */
export function textGenreCondition(column: string, input: unknown, paramIdx: number): GenreCondition | null {
  const values = genreFilterValues(String(input ?? ""));
  if (!values.length) return null;
  return { sql: `LOWER(BTRIM(${column})) = ANY($${paramIdx}::text[])`, params: [values] };
}

/** Artist genre that may be a JSONB string or JSONB array on the profile, plain text on the artist. */
export function artistGenreCondition(input: unknown, paramIdx: number): GenreCondition | null {
  const values = genreFilterValues(String(input ?? ""));
  if (!values.length) return null;
  const p = `$${paramIdx}::text[]`;
  return {
    sql: `(LOWER(BTRIM(COALESCE(ap.genre #>> '{}', art.genre))) = ANY(${p}) OR EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(ap.genre) = 'array' THEN ap.genre ELSE '[]'::jsonb END) g(v)
      WHERE LOWER(BTRIM(g.v)) = ANY(${p})))`,
    params: [values],
  };
}

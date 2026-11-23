import { sql } from "drizzle-orm";
import { db } from "../db";

export function slugifyPlace(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cleanPlaceName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export interface ResolvedPlace {
  cityId: number | null;
  neighbourhoodId: number | null;
}

/**
 * Finds or creates the city (within the country) and the neighbourhood (within
 * the city) so admins can add places the first time an artist from there shows up.
 */
export async function resolveArtistPlace(
  countryCode: string | null,
  cityName: string,
  neighbourhoodName: string,
): Promise<ResolvedPlace> {
  const city = cleanPlaceName(cityName);
  if (!city) return { cityId: null, neighbourhoodId: null };
  if (!countryCode) {
    throw new Error("A country is required before choosing a city");
  }

  const countryRows = await db.execute(
    sql`SELECT id FROM countries WHERE UPPER(code) = ${countryCode.toUpperCase()} LIMIT 1`,
  );
  const countryId = (countryRows.rows[0] as { id: number } | undefined)?.id;
  if (!countryId) throw new Error(`Unknown country ${countryCode}`);

  const cityRows = await db.execute(
    sql`SELECT id FROM cities
        WHERE country_id = ${countryId} AND LOWER(name) = LOWER(${city})
        ORDER BY id LIMIT 1`,
  );
  let cityId = (cityRows.rows[0] as { id: number } | undefined)?.id;
  if (!cityId) {
    const inserted = await db.execute(
      sql`INSERT INTO cities (name, country_id) VALUES (${city}, ${countryId}) RETURNING id`,
    );
    cityId = (inserted.rows[0] as { id: number }).id;
  }

  const hood = cleanPlaceName(neighbourhoodName);
  if (!hood) return { cityId, neighbourhoodId: null };
  const slug = slugifyPlace(hood);
  if (!slug) return { cityId, neighbourhoodId: null };

  const hoodRows = await db.execute(
    sql`INSERT INTO neighbourhoods (city_id, name, slug)
        VALUES (${cityId}, ${hood}, ${slug})
        ON CONFLICT (city_id, slug) DO UPDATE SET slug = EXCLUDED.slug
        RETURNING id`,
  );
  return {
    cityId,
    neighbourhoodId: (hoodRows.rows[0] as { id: number }).id,
  };
}

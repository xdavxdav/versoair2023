export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export function getDirectoryCountryCode(): string {
  const code = (
    process.env.VITE_DIRECTORY_COUNTRY_CODE || "CA"
  ).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new Error("VITE_DIRECTORY_COUNTRY_CODE must be a two-letter country code");
  }
  return code;
}

/** Country the visitor selected (?countryCode= / ?country_code= / ?country=), if valid. */
export function requestedCountryCode(req: {
  query?: Record<string, unknown>;
}): string | null {
  const query = req.query ?? {};
  return (
    normalizeCountryCode(query.countryCode) ??
    normalizeCountryCode(query.country_code) ??
    normalizeCountryCode(query.country)
  );
}

/** Selected country, falling back to the configured default market. */
export function requestedOrDefaultCountryCode(req: {
  query?: Record<string, unknown>;
}): string {
  return requestedCountryCode(req) ?? getDirectoryCountryCode();
}

/**
 * Public visibility predicate (active, verified, not a placeholder).
 * Pass a country to scope list endpoints to the visitor's selection; omit it
 * for detail, media, SEO and sitemap lookups so every country's pages resolve.
 * The country is validated as a two-letter code before it reaches the SQL.
 */
export function publicBusinessVisibilitySql(
  tableAlias: "b" | "businesses",
  countryCode?: string | null,
): string {
  const country = normalizeCountryCode(countryCode);
  const countryClause = country
    ? `AND UPPER(${tableAlias}.country_code) = '${country}'`
    : "";
  return `${tableAlias}.is_active = true
    AND ${tableAlias}.is_verified = true
    ${countryClause}
    AND NOT COALESCE(${tableAlias}.email ILIKE '%@versoair.local', false)
    AND NOT COALESCE(${tableAlias}.website ILIKE '%.example.com', false)`;
}

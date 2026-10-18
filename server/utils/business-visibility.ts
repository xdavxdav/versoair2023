export function getDirectoryCountryCode(): string {
  const code = (
    process.env.VITE_DIRECTORY_COUNTRY_CODE || "CA"
  ).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new Error("VITE_DIRECTORY_COUNTRY_CODE must be a two-letter country code");
  }
  return code;
}

export function publicBusinessVisibilitySql(
  tableAlias: "b" | "businesses",
): string {
  return `${tableAlias}.is_active = true
    AND ${tableAlias}.is_verified = true
    AND UPPER(${tableAlias}.country_code) = '${getDirectoryCountryCode()}'
    AND NOT COALESCE(${tableAlias}.email ILIKE '%@versoair.local', false)
    AND NOT COALESCE(${tableAlias}.website ILIKE '%.example.com', false)`;
}

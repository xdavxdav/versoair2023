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
    AND NOT (
      COALESCE(${tableAlias}.email LIKE 'contact+%@versoair.local', false)
      AND COALESCE(${tableAlias}.website LIKE '%.example.com', false)
      AND COALESCE(${tableAlias}.phone LIKE '+1-555-%', false)
    )`;
}

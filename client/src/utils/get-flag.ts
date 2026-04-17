/**
 * Convert a 2-letter ISO country code to its flag emoji.
 * Safe against null, undefined, numbers, or non-string values.
 * @example getFlag("CA") → "🇨🇦"
 */
export function getFlag(code: unknown): string {
  if (typeof code !== "string" || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

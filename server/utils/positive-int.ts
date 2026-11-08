// Strict positive-integer parser for ids that come from params, bodies and JWTs.
// Unlike Number(), it rejects booleans, blanks, exponents, arrays and floats.
export function parsePositiveInt(value: unknown): number | null {
  let candidate = value;
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    candidate = Number(trimmed);
  }
  return typeof candidate === "number" &&
    Number.isSafeInteger(candidate) &&
    candidate > 0
    ? candidate
    : null;
}

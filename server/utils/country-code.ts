export type CountryCodeInput =
  | { ok: true; value: string | null | undefined }
  | { ok: false };

// undefined = not sent (keep the stored value), null = cleared, otherwise a
// 2-letter ISO code normalised to upper case.
export function parseCountryCode(value: unknown): CountryCodeInput {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value === "string" && /^[A-Za-z]{2}$/.test(value.trim())) {
    return { ok: true, value: value.trim().toUpperCase() };
  }
  return { ok: false };
}

export const INVALID_COUNTRY_CODE_RESPONSE = {
  success: false,
  status: 400,
  error: {
    code: "VALIDATION_ERROR",
    message: "countryCode must be a 2-letter country code",
  },
} as const;

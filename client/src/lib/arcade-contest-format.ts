// Contest money travels as integer minor units. XOF and XAF have no minor unit,
// so Intl's fraction digits tell us how many digits to shift for each currency.
function currencyFormat(currency: string, locale?: string): Intl.NumberFormat | null {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency });
  } catch {
    return null;
  }
}

function minorDigits(currency: string): number {
  return currencyFormat(currency)?.resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMinor(minor: number, currency: string, locale?: string): string {
  const digits = minorDigits(currency);
  const major = minor / 10 ** digits;
  return currencyFormat(currency, locale)?.format(major) ?? `${major.toFixed(digits)} ${currency}`;
}

/** "12.50" -> 1250 for CAD, "1250" -> 1250 for XOF. Null when it is not an exact amount. */
export function majorToMinor(text: string, currency: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const digits = minorDigits(currency);
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > digits) return null;
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || 0);
  return Number.isSafeInteger(minor) ? minor : null;
}

export function minorToMajorText(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  return (minor / 10 ** digits).toFixed(digits);
}

/** "12.5" -> 1250 basis points. Null unless it is 0-100 with at most two decimals. */
export function percentToBps(text: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const bps = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0") || 0);
  return bps <= 10_000 ? bps : null;
}

/** "2026-01" -> "2025-12". Empty when the key is not YYYY-MM. */
export function previousSeasonKey(seasonKey: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(seasonKey);
  if (!match) return "";
  const previous = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type ContestPanelMode = "hidden" | "earnings" | "full";

/** With no country contest open the panel disappears, except for money an artist is still owed. */
export function contestPanelMode(openContests: number, hasEarnings: boolean): ContestPanelMode {
  if (openContests > 0) return "full";
  return hasEarnings ? "earnings" : "hidden";
}

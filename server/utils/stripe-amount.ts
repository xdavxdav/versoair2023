/**
 * Minor-unit conversion for staff-initiated Stripe charges.
 *
 * Stripe takes whole minor units. Zero-decimal currencies (XOF, XAF) are
 * already whole, so multiplying them by 100 would charge 100 times too much.
 * Only currencies whose exponent is known are accepted; anything else is
 * rejected instead of being scaled on a guess.
 */

const ZERO_DECIMAL_CURRENCIES = ["XOF", "XAF"] as const;
const TWO_DECIMAL_CURRENCIES = [
  "USD",
  "CAD",
  "EUR",
  "GBP",
  "CHF",
  "NGN",
  "KES",
  "ZAR",
  "GHS",
  "MAD",
] as const;

export const SUPPORTED_CHARGE_CURRENCIES: readonly string[] = [
  ...TWO_DECIMAL_CURRENCIES,
  ...ZERO_DECIMAL_CURRENCIES,
];

// Stripe's maximum for a single charge, in minor units.
export const MAX_CHARGE_MINOR_UNITS = 99_999_999;

export function isZeroDecimalCurrency(currency: string): boolean {
  return (ZERO_DECIMAL_CURRENCIES as readonly string[]).includes(currency);
}

export type ChargeAmount =
  | {
      ok: true;
      currency: string;
      /** Integer to send to Stripe. */
      minorUnits: number;
      /** Decimal string for the NUMERIC(12,2) ledger columns, e.g. "5000.00". */
      major: string;
    }
  | {
      ok: false;
      code: "INVALID_CURRENCY" | "INVALID_AMOUNT";
      error: string;
    };

/**
 * Validates an untrusted amount and currency pair. Amounts are read as text,
 * never through floating point, so "19.99" is exactly 1999 minor units.
 */
export function parseChargeAmount(
  amount: unknown,
  currency: unknown,
): ChargeAmount {
  const code = typeof currency === "string" ? currency.trim().toUpperCase() : "";
  if (!SUPPORTED_CHARGE_CURRENCIES.includes(code)) {
    return {
      ok: false,
      code: "INVALID_CURRENCY",
      error: `Unsupported currency. Use one of: ${SUPPORTED_CHARGE_CURRENCIES.join(", ")}`,
    };
  }

  const text =
    typeof amount === "number" && Number.isFinite(amount)
      ? String(amount)
      : typeof amount === "string"
        ? amount.trim()
        : "";
  const match = /^(\d{1,15})(?:\.(\d+))?$/.exec(text);
  if (!match) {
    return { ok: false, code: "INVALID_AMOUNT", error: "Invalid amount" };
  }
  const whole = match[1];
  const fraction = match[2] ?? "";

  const zeroDecimal = isZeroDecimalCurrency(code);
  if (zeroDecimal && /[1-9]/.test(fraction)) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      error: `${code} amounts must be whole numbers`,
    };
  }
  if (!zeroDecimal && /[1-9]/.test(fraction.slice(2))) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      error: "Amounts can have at most 2 decimal places",
    };
  }

  const minorUnits = zeroDecimal
    ? Number(whole)
    : Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(minorUnits) || minorUnits <= 0) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      error: "Amount must be greater than zero",
    };
  }
  if (minorUnits > MAX_CHARGE_MINOR_UNITS) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      error: "Amount is above the maximum that can be charged",
    };
  }

  const major = zeroDecimal
    ? `${minorUnits}.00`
    : `${Math.floor(minorUnits / 100)}.${String(minorUnits % 100).padStart(2, "0")}`;
  return { ok: true, currency: code, minorUnits, major };
}

/**
 * Pure helpers for the staff charge and refund screens.
 *
 * The server (server/utils/stripe-amount.ts) decides what is accepted. These
 * checks only give staff an answer before a request is sent, and
 * charge-form.test.ts compares them with the server's rules so they cannot
 * drift apart.
 */

export const CHARGE_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "XOF", name: "West African CFA Franc" },
  { code: "XAF", name: "Central African CFA Franc" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "ZAR", name: "South African Rand" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "MAD", name: "Moroccan Dirham" },
] as const;

const WHOLE_UNIT_CURRENCIES = ["XOF", "XAF"];
const MAX_MINOR_UNITS = 99_999_999;

/** Currencies with no minor unit: 5000 means 5000 francs, not 50.00. */
export function isWholeUnitCurrency(currency: string): boolean {
  return WHOLE_UNIT_CURRENCIES.includes(currency.trim().toUpperCase());
}

export function amountInputProps(currency: string) {
  return isWholeUnitCurrency(currency)
    ? { step: "1", min: "1", placeholder: "0" }
    : { step: "0.01", min: "0.50", placeholder: "0.00" };
}

export function quickAmountsFor(currency: string): number[] {
  return isWholeUnitCurrency(currency)
    ? [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000]
    : [5, 10, 20, 25, 50, 100, 200, 500];
}

export type AmountCheck =
  | { ok: true; amount: string; minorUnits: number }
  | { ok: false; error: string };

/**
 * Validates the amount exactly as typed. Nothing goes through floating point:
 * the text that passes is the text that is sent.
 */
export function checkChargeAmount(
  text: string,
  currency: string,
): AmountCheck {
  const code = currency.trim().toUpperCase();
  if (!CHARGE_CURRENCIES.some((c) => c.code === code)) {
    return { ok: false, error: "Choose one of the supported currencies." };
  }

  const amount = text.trim();
  const match = /^(\d{1,15})(?:\.(\d+))?$/.exec(amount);
  if (!match) {
    return {
      ok: false,
      error: "Enter the amount as a plain number, for example 25.00.",
    };
  }
  const whole = match[1];
  const fraction = match[2] ?? "";

  const wholeUnits = isWholeUnitCurrency(code);
  if (wholeUnits && /[1-9]/.test(fraction)) {
    return {
      ok: false,
      error: `${code} amounts are whole numbers, without decimals.`,
    };
  }
  if (!wholeUnits && /[1-9]/.test(fraction.slice(2))) {
    return { ok: false, error: "Amounts can have at most 2 decimal places." };
  }

  const minorUnits = wholeUnits
    ? Number(whole)
    : Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(minorUnits) || minorUnits > MAX_MINOR_UNITS) {
    return {
      ok: false,
      error: "Amount is above the maximum that can be charged.",
    };
  }
  if (minorUnits <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }
  return { ok: true, amount, minorUnits };
}

/** Always names the currency: a bare "$" is ambiguous (USD, CAD) and wrong for francs. */
export function formatMoney(
  amount: string | number | null | undefined,
  currency: string,
  locale?: string,
): string {
  const code = currency.trim().toUpperCase();
  const value =
    typeof amount === "number"
      ? amount
      : typeof amount === "string" && amount.trim() !== ""
        ? Number(amount)
        : NaN;
  if (!Number.isFinite(value)) return `${code} ${amount ?? ""}`.trim();
  const digits = isWholeUnitCurrency(code) ? 0 : 2;
  return `${code} ${value.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

// ─── Charge attempts ──────────────────────────────────────────────────────────

export interface ChargeRequest {
  cardId: number;
  /** Validated amount text, sent as typed. */
  amount: string;
  currency: string;
  description: string;
  category: string;
}

/**
 * One intended charge. The key is sent with every try, so a retry after a
 * dropped connection or a server error can never charge the card twice.
 */
export interface ChargeAttempt {
  key: string;
  identity: string;
  request: ChargeRequest;
}

export function newIdempotencyKey(
  cryptoApi: { randomUUID?: () => string } | undefined = globalThis.crypto,
): string {
  const id =
    typeof cryptoApi?.randomUUID === "function"
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  // The server accepts 8-64 letters, digits, underscores and hyphens.
  return `pos-${id}`.slice(0, 64);
}

/** What makes two requests "the same charge": card, amount and currency. */
function chargeIdentity(request: ChargeRequest): string {
  const code = request.currency.trim().toUpperCase();
  const checked = checkChargeAmount(request.amount, code);
  const amount = checked.ok ? String(checked.minorUnits) : request.amount.trim();
  return JSON.stringify([String(request.cardId), amount, code]);
}

/**
 * Returns the attempt to send. While the previous attempt is unresolved and
 * the card, amount and currency are unchanged, the original request is sent
 * again as it was: a retry must repeat the first request, so edits to the
 * description in between are not applied.
 */
export function attemptFor(
  previous: ChargeAttempt | null,
  request: ChargeRequest,
  makeKey: () => string = newIdempotencyKey,
): ChargeAttempt {
  const identity = chargeIdentity(request);
  if (previous && previous.identity === identity) return previous;
  return { key: makeKey(), identity, request };
}

// ─── Reading server replies ───────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const CHARGE_RETRY_HINT =
  "Press Charge again to retry the same attempt; it is sent exactly as before and the card will not be charged twice.";
const REFUND_RETRY_HINT =
  "Press Refund again to retry; the refund will never be issued twice.";

export interface ChargeOutcome {
  ok: boolean;
  /**
   * True while it is unknown whether the card was charged. The same attempt
   * (and key) must be sent again instead of starting a new one.
   */
  keepAttempt: boolean;
  /** The server recognised an earlier identical attempt and charged nothing new. */
  replayed: boolean;
  paymentIntentId?: string;
  /** Staff-facing explanation for every failure. */
  message: string;
}

/** `status` is null when no reply arrived (the request itself failed). */
export function interpretChargeResponse(
  status: number | null,
  body: unknown,
): ChargeOutcome {
  const failure = (keepAttempt: boolean, message: string): ChargeOutcome => ({
    ok: false,
    keepAttempt,
    replayed: false,
    message,
  });

  if (status === null) {
    return failure(
      true,
      `The connection dropped, so we can't tell whether the card was charged. ${CHARGE_RETRY_HINT}`,
    );
  }

  const data = asRecord(body);
  const code = asText(data.code);
  const error = asText(data.error);

  if (status >= 200 && status < 300) {
    if (data.success !== true) {
      return failure(
        true,
        "The server sent an unexpected reply. Check Charge History before trying again.",
      );
    }
    const result = asRecord(data.data);
    return {
      ok: true,
      keepAttempt: false,
      replayed: result.replayed === true,
      paymentIntentId: asText(asRecord(result.paymentIntent).id),
      message: "",
    };
  }

  if (code === "CHARGE_NOT_RECORDED") {
    const reference = asText(data.paymentIntentId);
    return failure(
      true,
      `${error ?? "The card was charged but the charge could not be recorded."}${
        reference ? ` Payment reference: ${reference}.` : ""
      }`,
    );
  }
  if (code === "IDEMPOTENCY_CONFLICT") {
    return failure(
      true,
      "This charge is still being processed. Wait a moment, then press Charge again or check Charge History.",
    );
  }
  if (code === "STRIPE_CONNECTION_ERROR") {
    return failure(true, error ?? CHARGE_RETRY_HINT);
  }
  if (code === "ONLINE_PAYMENTS_UNAVAILABLE") {
    return failure(false, error ?? "Online payments are not available.");
  }
  if (status >= 500) {
    return failure(
      true,
      `${error ?? `The server could not finish the charge (HTTP ${status}).`} ${CHARGE_RETRY_HINT}`,
    );
  }
  return failure(false, error ?? "Charge failed");
}

export interface RefundOutcome {
  ok: boolean;
  /** Already refunded: refresh the list instead of retrying. */
  alreadyRefunded: boolean;
  message: string;
}

export function interpretRefundResponse(
  status: number | null,
  body: unknown,
): RefundOutcome {
  const failure = (message: string, alreadyRefunded = false): RefundOutcome => ({
    ok: false,
    alreadyRefunded,
    message,
  });

  if (status === null) {
    return failure(
      `The connection dropped, so we can't tell whether the refund went through. ${REFUND_RETRY_HINT}`,
    );
  }

  const data = asRecord(body);
  const code = asText(data.code);
  const error = asText(data.error);

  if (status >= 200 && status < 300) {
    return data.success === true
      ? { ok: true, alreadyRefunded: false, message: "" }
      : failure(
          "The server sent an unexpected reply. Check Charge History before trying again.",
        );
  }

  if (code === "ALREADY_REFUNDED") {
    return failure("This charge has already been refunded.", true);
  }
  if (code === "REFUND_NOT_RECORDED") {
    const reference = asText(data.refundId);
    return failure(
      `${error ?? "The refund was issued but could not be recorded."}${
        reference ? ` Refund reference: ${reference}.` : ""
      }`,
    );
  }
  if (code === "IDEMPOTENCY_CONFLICT") {
    return failure(
      "A refund for this charge is already in progress. Wait a moment, then refresh Charge History.",
    );
  }
  if (code === "STRIPE_CONNECTION_ERROR") {
    return failure(error ?? REFUND_RETRY_HINT);
  }
  if (status >= 500) {
    return failure(
      `${error ?? `The server could not finish the refund (HTTP ${status}).`} ${REFUND_RETRY_HINT}`,
    );
  }
  return failure(error ?? "Refund failed");
}

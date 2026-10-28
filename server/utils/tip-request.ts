export const TIP_MIN = 0.5;
export const TIP_MAX = 500;

export type TipRequest = {
  artistProfileId: number;
  amount: number;
  idempotencyKey: string;
};

export type TipValidation =
  { ok: true; value: TipRequest } | { ok: false; message: string };

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

export function validateTipRequest(
  body: unknown,
  headerKey: unknown,
): TipValidation {
  const input = (body ?? {}) as Record<string, unknown>;
  const artistProfileId = Number(input.artistProfileId);
  if (!Number.isInteger(artistProfileId) || artistProfileId <= 0) {
    return { ok: false, message: "A valid artist is required" };
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < TIP_MIN || amount > TIP_MAX) {
    return {
      ok: false,
      message: `Tip amount must be between $${TIP_MIN.toFixed(2)} and $${TIP_MAX.toFixed(2)}`,
    };
  }
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
    return { ok: false, message: "Tip amount must have at most 2 decimals" };
  }

  const key =
    typeof headerKey === "string" && headerKey
      ? headerKey
      : typeof input.idempotencyKey === "string"
        ? input.idempotencyKey
        : "";
  if (!KEY_PATTERN.test(key)) {
    return { ok: false, message: "A valid idempotency key is required" };
  }

  return { ok: true, value: { artistProfileId, amount, idempotencyKey: key } };
}

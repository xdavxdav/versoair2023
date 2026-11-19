/**
 * Staff-initiated charges and refunds against saved cards (the vault POS).
 *
 * Stripe and the database cannot share a transaction, so each step is ordered
 * to be recoverable:
 *  - Stripe requests carry an idempotency key, so a retry returns the same
 *    PaymentIntent or refund instead of moving money twice;
 *  - the ledger rows are written in one database transaction behind a
 *    per-PaymentIntent advisory lock, so a retry never records a charge twice;
 *  - when money moved but the ledger write failed, an operator alert names the
 *    Stripe object to reconcile.
 * Route code only gates, authenticates, and maps the result to HTTP.
 */
import type Stripe from "stripe";
import { parseChargeAmount } from "../utils/stripe-amount";
import { redactStripeSecrets } from "../utils/stripe-client";
import { inTransaction } from "./db-transaction";
import type { TxPool } from "./marketing-checkout";
import { raisePaymentAlert, type PaymentAlert } from "./payment-alerts";

export const REFUND_REASONS = [
  "duplicate",
  "fraudulent",
  "requested_by_customer",
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,64}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_INT4 = 2_147_483_647;

export interface NgoChargeDeps {
  db: TxPool;
  stripe: Pick<Stripe, "paymentIntents" | "refunds">;
  alert?: (alert: PaymentAlert) => Promise<void>;
}

export interface ServiceFailure {
  ok: false;
  status: number;
  error: string;
  code?: string;
  paymentIntentId?: string;
  refundId?: string;
}

export interface ChargeInput {
  cardId?: unknown;
  amount?: unknown;
  currency?: unknown;
  description?: unknown;
  category?: unknown;
  /** Optional client-generated key that makes a retried request safe. */
  idempotencyKey?: unknown;
  /** Authenticated staff member recorded as the processor. */
  actorUserId: number | null;
}

export type ChargeResult =
  | {
      ok: true;
      /** True when this request found a charge that was already recorded. */
      replayed: boolean;
      charge: Record<string, unknown>;
      paymentIntent: {
        id: string;
        status: string;
        amount: number;
        currency: string;
      };
    }
  | ServiceFailure;

export interface RefundInput {
  chargeId?: unknown;
  reason?: unknown;
}

export type RefundResult =
  | { ok: true; refundId: string; status: string | null; amount: number }
  | ServiceFailure;

function fail(
  status: number,
  error: string,
  code?: string,
  extra: Pick<ServiceFailure, "paymentIntentId" | "refundId"> = {},
): ServiceFailure {
  return { ok: false, status, error, ...(code ? { code } : {}), ...extra };
}

function parseCardId(value: unknown): number | null {
  const text =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";
  if (!/^\d{1,10}$/.test(text)) return null;
  const id = Number(text);
  return id > 0 && id <= MAX_INT4 ? id : null;
}

/** Trimmed text within `max`, the fallback when absent, or null when invalid. */
function optionalText(
  value: unknown,
  max: number,
  fallback: string,
): string | null {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length <= max ? text : null;
}

function stripeFields(error: unknown): {
  type?: string;
  code?: string;
  message: string;
} {
  const e = (error && typeof error === "object" ? error : {}) as {
    type?: string;
    code?: string;
    message?: unknown;
  };
  return {
    type: e.type,
    code: e.code,
    message: redactStripeSecrets(e.message ?? "Unknown error"),
  };
}

function mapChargeError(error: unknown, usedKey: boolean): ServiceFailure {
  const { type, code, message } = stripeFields(error);
  if (code === "authentication_required") {
    return fail(
      402,
      "Card requires authentication. Cannot charge off-session.",
      "authentication_required",
    );
  }
  if (type === "StripeCardError") {
    return fail(402, `Card declined: ${message}`, code);
  }
  if (type === "StripeIdempotencyError") {
    return fail(
      409,
      "This request is already in progress or its idempotencyKey was used with different details",
      "IDEMPOTENCY_CONFLICT",
    );
  }
  if (type === "StripeConnectionError") {
    return fail(
      502,
      usedKey
        ? "Could not reach Stripe. Retry the same request; it will not be charged twice."
        : "Could not reach Stripe. The charge may or may not have gone through; check Stripe before retrying.",
      "STRIPE_CONNECTION_ERROR",
    );
  }
  return fail(500, message);
}

async function raise(
  deps: NgoChargeDeps,
  alert: PaymentAlert,
): Promise<void> {
  await (deps.alert ?? raisePaymentAlert)(alert);
}

interface ChargeRecord {
  paymentIntentId: string;
  cardId: number;
  userId: number;
  amount: string;
  currency: string;
  description: string;
  category: string;
  status: "succeeded" | "pending";
  processedBy: number | null;
}

async function recordCharge(
  db: TxPool,
  record: ChargeRecord,
): Promise<{ replayed: boolean; charge: Record<string, unknown> }> {
  return inTransaction(db, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `ngo-charge:${record.paymentIntentId}`,
    ]);

    const existing = await client.query(
      `SELECT * FROM ngo_charges WHERE stripe_payment_intent_id = $1 ORDER BY created_at LIMIT 1`,
      [record.paymentIntentId],
    );
    if (existing.rows.length > 0) {
      return { replayed: true, charge: existing.rows[0] };
    }

    const inserted = await client.query(
      `INSERT INTO ngo_charges
         (payment_method_id, user_id, amount, currency, description, category,
          stripe_payment_intent_id, status, processed_by, receipt_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        record.cardId,
        record.userId,
        record.amount,
        record.currency,
        record.description,
        record.category,
        record.paymentIntentId,
        record.status,
        record.processedBy,
        null, // receipt URL populated by webhook later
      ],
    );

    await client.query(
      `INSERT INTO transactions (user_id, amount, currency, type, status, reference)
       VALUES ($1, $2, $3, 'ngo_charge', $4, $5)
       ON CONFLICT DO NOTHING`,
      [
        record.userId,
        record.amount,
        record.currency,
        record.status === "succeeded" ? "completed" : "pending",
        record.paymentIntentId,
      ],
    );

    return { replayed: false, charge: inserted.rows[0] };
  });
}

export async function chargeSavedCard(
  deps: NgoChargeDeps,
  input: ChargeInput,
): Promise<ChargeResult> {
  if (!input.cardId || !input.amount) {
    return fail(400, "cardId and amount are required");
  }

  const cardId = parseCardId(input.cardId);
  if (cardId === null) return fail(400, "Invalid cardId");

  const currency =
    input.currency === undefined ||
    input.currency === null ||
    input.currency === ""
      ? "CAD"
      : input.currency;
  const parsed = parseChargeAmount(input.amount, currency);
  if (!parsed.ok) return fail(400, parsed.error, parsed.code);

  const description = optionalText(
    input.description,
    500,
    "NGO Activity Charge",
  );
  const category = optionalText(input.category, 50, "activity_fee");
  if (description === null || category === null) {
    return fail(
      400,
      "description must be at most 500 characters and category at most 50",
    );
  }

  let idempotencyKey: string | undefined;
  if (input.idempotencyKey !== undefined && input.idempotencyKey !== null) {
    if (
      typeof input.idempotencyKey !== "string" ||
      !IDEMPOTENCY_KEY.test(input.idempotencyKey)
    ) {
      return fail(
        400,
        "idempotencyKey must be 8-64 letters, digits, underscores or hyphens",
        "INVALID_IDEMPOTENCY_KEY",
      );
    }
    idempotencyKey = `ngo-charge-${input.idempotencyKey}`;
  }

  const cardResult = await deps.db.query(
    `SELECT spm.*, u.email, u.username
       FROM saved_payment_methods spm
       JOIN users u ON u.id = spm.user_id
      WHERE spm.id = $1 AND spm.status = 'active'`,
    [cardId],
  );
  if (cardResult.rows.length === 0) {
    return fail(404, "Active card not found");
  }
  const card = cardResult.rows[0];

  let paymentIntent: Stripe.PaymentIntent;
  try {
    paymentIntent = await deps.stripe.paymentIntents.create(
      {
        amount: parsed.minorUnits,
        currency: parsed.currency.toLowerCase(),
        customer: card.stripe_customer_id,
        payment_method: card.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description,
        metadata: {
          source: "ngo_pos",
          cardId: String(cardId),
          userId: String(card.user_id),
          category,
          processedBy: input.actorUserId ? String(input.actorUserId) : "system",
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
  } catch (error) {
    console.error("❌ POS Charge error:", stripeFields(error).message);
    return mapChargeError(error, idempotencyKey !== undefined);
  }

  const status = paymentIntent.status === "succeeded" ? "succeeded" : "pending";
  try {
    const recorded = await recordCharge(deps.db, {
      paymentIntentId: paymentIntent.id,
      cardId,
      userId: card.user_id,
      amount: parsed.major,
      currency: parsed.currency,
      description,
      category,
      status,
      processedBy: input.actorUserId,
    });

    console.log(
      `💰 POS Charge: ${parsed.currency} ${parsed.major} → ${card.card_brand} ****${card.card_last4} (${card.username}) — ${description}`,
    );

    return {
      ok: true,
      replayed: recorded.replayed,
      charge: recorded.charge,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: Number(parsed.major),
        currency: parsed.currency,
      },
    };
  } catch (error) {
    await raise(deps, {
      kind: "ngo_charge_not_recorded",
      summary:
        "A saved-card charge succeeded in Stripe but could not be recorded in the database.",
      details: {
        paymentIntentId: paymentIntent.id,
        paymentIntentStatus: paymentIntent.status,
        amount: parsed.major,
        currency: parsed.currency,
        cardId,
        userId: card.user_id,
        error: stripeFields(error).message,
      },
    });
    return fail(
      500,
      idempotencyKey
        ? "The card was charged but the charge could not be recorded. Retry the same request to record it without charging again."
        : "The card was charged but the charge could not be recorded. Reconcile it using the PaymentIntent id.",
      "CHARGE_NOT_RECORDED",
      { paymentIntentId: paymentIntent.id },
    );
  }
}

async function markRefunded(
  db: TxPool,
  chargeId: string,
  paymentIntentId: string,
  reason: string,
): Promise<void> {
  await inTransaction(db, async (client) => {
    await client.query(
      `UPDATE ngo_charges
          SET status = 'refunded', refunded_at = NOW(), refund_reason = $2
        WHERE id = $1 AND status IS DISTINCT FROM 'refunded'`,
      [chargeId, reason],
    );
    await client.query(
      `UPDATE transactions SET status = 'refunded' WHERE reference = $1`,
      [paymentIntentId],
    );
  });
}

export async function refundNgoCharge(
  deps: NgoChargeDeps,
  input: RefundInput,
): Promise<RefundResult> {
  if (!input.chargeId) return fail(400, "chargeId is required");
  if (typeof input.chargeId !== "string" || !UUID.test(input.chargeId)) {
    return fail(400, "Invalid chargeId");
  }
  const chargeId = input.chargeId;

  const reason =
    input.reason === undefined || input.reason === null || input.reason === ""
      ? "requested_by_customer"
      : input.reason;
  if (
    typeof reason !== "string" ||
    !(REFUND_REASONS as readonly string[]).includes(reason)
  ) {
    return fail(
      400,
      `reason must be one of: ${REFUND_REASONS.join(", ")}`,
      "INVALID_REFUND_REASON",
    );
  }

  const chargeResult = await deps.db.query(
    `SELECT * FROM ngo_charges WHERE id = $1`,
    [chargeId],
  );
  if (chargeResult.rows.length === 0) return fail(404, "Charge not found");
  const charge = chargeResult.rows[0];

  if (charge.status === "refunded") {
    return fail(400, "Charge already refunded", "ALREADY_REFUNDED");
  }
  if (!charge.stripe_payment_intent_id) {
    return fail(400, "No Stripe payment intent for this charge");
  }
  const paymentIntentId: string = charge.stripe_payment_intent_id;

  let refund: Stripe.Refund;
  try {
    refund = await deps.stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason,
      },
      { idempotencyKey: `ngo-refund-${chargeId}` },
    );
  } catch (error) {
    const { type, code, message } = stripeFields(error);
    console.error("❌ Refund error:", message);

    if (code === "charge_already_refunded") {
      // Refunded outside this app (or after the idempotency key expired).
      await markRefunded(deps.db, chargeId, paymentIntentId, reason).catch(
        (dbError) =>
          console.error(
            "❌ Could not mark an already-refunded charge:",
            redactStripeSecrets(dbError?.message),
          ),
      );
      return fail(400, "Charge already refunded", "ALREADY_REFUNDED");
    }
    if (type === "StripeIdempotencyError") {
      return fail(
        409,
        "A refund for this charge is already in progress",
        "IDEMPOTENCY_CONFLICT",
      );
    }
    if (type === "StripeConnectionError") {
      return fail(
        502,
        "Could not reach Stripe. Retry the refund; it will not be issued twice.",
        "STRIPE_CONNECTION_ERROR",
      );
    }
    if (type === "StripeInvalidRequestError") {
      return fail(400, message, code);
    }
    return fail(500, message);
  }

  try {
    await markRefunded(deps.db, chargeId, paymentIntentId, reason);
  } catch (error) {
    await raise(deps, {
      kind: "ngo_refund_not_recorded",
      summary:
        "A refund was issued in Stripe but the charge could not be marked refunded in the database.",
      details: {
        chargeId,
        paymentIntentId,
        refundId: refund.id,
        error: stripeFields(error).message,
      },
    });
    return fail(
      500,
      "The refund was issued but could not be recorded. Retry the refund to record it; it will not be issued twice.",
      "REFUND_NOT_RECORDED",
      { refundId: refund.id },
    );
  }

  console.log(
    `↩️ Refund processed: Charge ${chargeId} — ${charge.currency} ${charge.amount}`,
  );
  return {
    ok: true,
    refundId: refund.id,
    status: refund.status,
    amount: parseFloat(charge.amount),
  };
}

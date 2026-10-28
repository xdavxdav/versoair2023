/**
 * Marketing cart pricing and Stripe Checkout creation.
 *
 * Shown = stored = charged: the unit price of every cart line is read from the
 * database at checkout time (never from the request), totals are integer cents,
 * and the same cents are written to the order and sent to Stripe.
 */
import type { Request, RequestHandler } from "express";
import type Stripe from "stripe";
import { redactStripeSecrets } from "../utils/stripe-client";

export const MARKETING_CURRENCY = "cad";
export const MARKETING_ORDER_CURRENCY = "CAD";

export const MAX_LINE_QUANTITY = 1000;
// Stripe's minimum charge for CAD and its maximum amount per charge.
export const MIN_CHARGE_CENTS = 50;
export const MAX_CHARGE_CENTS = 99_999_999;

export interface DbResult {
  rows: any[];
  rowCount?: number | null;
}
export interface Queryable {
  query(text: string, params?: any[]): Promise<DbResult>;
}
export interface TxClient extends Queryable {
  release(): void;
}
export interface TxPool extends Queryable {
  connect(): Promise<TxClient>;
}

const PRODUCT_TABLES = {
  pack: "marketing_packs",
  print_product: "print_products",
} as const;

export type SellableItemType = keyof typeof PRODUCT_TABLES;

export function isSellableItemType(value: unknown): value is SellableItemType {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PRODUCT_TABLES, value)
  );
}

/** Positive integer id from untrusted input, or null. */
export function parseItemId(value: unknown): number | null {
  const id = typeof value === "string" ? Number(value.trim()) : value;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

/** Whole quantity between 1 and MAX_LINE_QUANTITY from untrusted input, or null. */
export function parseQuantity(value: unknown): number | null {
  const qty = typeof value === "string" ? Number(value.trim()) : value;
  return typeof qty === "number" &&
    Number.isSafeInteger(qty) &&
    qty >= 1 &&
    qty <= MAX_LINE_QUANTITY
    ? qty
    : null;
}

// The real column is "active"; "is_active" is tolerated for older databases.
function activeProductSql(alias: string): string {
  return `COALESCE((to_jsonb(${alias})->>'is_active')::boolean, (to_jsonb(${alias})->>'active')::boolean, false) = true`;
}

export interface SellableProduct {
  id: number;
  name: string;
  priceCents: number;
}

/** Current database price of an active product, or null when it cannot be sold. */
export async function findSellableProduct(
  db: Queryable,
  itemType: SellableItemType,
  itemId: number,
): Promise<SellableProduct | null> {
  const result = await db.query(
    `SELECT t.id, t.name, t.price_cents
       FROM ${PRODUCT_TABLES[itemType]} t
      WHERE t.id = $1 AND ${activeProductSql("t")}`,
    [itemId],
  );
  const row = result.rows[0];
  if (!row) return null;

  const priceCents = Number(row.price_cents);
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new Error(`Invalid stored price for ${itemType} #${itemId}`);
  }
  return { id: Number(row.id), name: String(row.name ?? ""), priceCents };
}

export interface PricedCartLine {
  itemType: SellableItemType;
  itemId: number;
  name: string;
  quantity: number;
  unitCents: number;
  lineCents: number;
}

export type CartPricing =
  | { ok: true; lines: PricedCartLine[]; totalCents: number }
  | {
      ok: false;
      status: number;
      code: string;
      error: string;
      items?: Array<{ item_type: string; item_id: number }>;
    };

/** Prices the user's server-side cart from current database prices. */
export async function priceCart(
  db: Queryable,
  userId: string | number,
): Promise<CartPricing> {
  const cart = await db.query(
    `SELECT id, item_type, item_id, quantity
       FROM cart_items
      WHERE user_id = $1
      ORDER BY id`,
    [userId],
  );
  if (cart.rows.length === 0) {
    return {
      ok: false,
      status: 400,
      code: "CART_EMPTY",
      error: "Cart is empty",
    };
  }

  const lines: PricedCartLine[] = [];
  const unavailable: Array<{ item_type: string; item_id: number }> = [];
  let totalCents = 0;

  for (const row of cart.rows) {
    const itemType = row.item_type;
    const itemId = Number(row.item_id);
    const quantity = parseQuantity(Number(row.quantity));
    const product =
      isSellableItemType(itemType) && quantity !== null
        ? await findSellableProduct(db, itemType, itemId)
        : null;

    if (!product || !isSellableItemType(itemType) || quantity === null) {
      unavailable.push({ item_type: String(itemType), item_id: itemId });
      continue;
    }

    const lineCents = product.priceCents * quantity;
    totalCents += lineCents;
    lines.push({
      itemType,
      itemId,
      name: product.name,
      quantity,
      unitCents: product.priceCents,
      lineCents,
    });
  }

  if (unavailable.length > 0) {
    return {
      ok: false,
      status: 409,
      code: "CART_ITEM_UNAVAILABLE",
      error:
        "Some items in your cart are no longer available. Remove them and try again.",
      items: unavailable,
    };
  }
  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents < MIN_CHARGE_CENTS ||
    totalCents > MAX_CHARGE_CENTS
  ) {
    return {
      ok: false,
      status: 400,
      code: "ORDER_TOTAL_OUT_OF_RANGE",
      error: "The order total is outside the amount that can be charged online.",
    };
  }

  return { ok: true, lines, totalCents };
}

export async function createPendingOrder(
  pool: TxPool,
  userId: string | number,
  lines: PricedCartLine[],
  totalCents: number,
): Promise<{ id: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const order = await client.query(
      `INSERT INTO orders (user_id, total_cents, currency, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [userId, totalCents, MARKETING_ORDER_CURRENCY],
    );
    const orderId = Number(order.rows[0].id);
    for (const line of lines) {
      await client.query(
        `INSERT INTO order_items
           (order_id, item_type, item_id, item_name, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          orderId,
          line.itemType,
          line.itemId,
          line.name,
          line.quantity,
          line.unitCents,
        ],
      );
    }
    await client.query("COMMIT");
    return { id: orderId };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export function buildCheckoutSessionParams(input: {
  lines: PricedCartLine[];
  orderId: number;
  userId: string | number;
  baseUrl: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    payment_method_types: ["card"],
    mode: "payment",
    line_items: input.lines.map((line) => ({
      price_data: {
        currency: MARKETING_CURRENCY,
        product_data: {
          name: (line.name || `${line.itemType} #${line.itemId}`).slice(0, 250),
          description: `Verso Air Marketing — ${line.itemType}`,
        },
        unit_amount: line.unitCents,
      },
      quantity: line.quantity,
    })),
    metadata: {
      userId: String(input.userId),
      orderId: String(input.orderId),
      type: "marketing_order",
    },
    success_url: `${input.baseUrl}/marketing/order-tracking?status=success&orderId=${input.orderId}`,
    cancel_url: `${input.baseUrl}/marketing/cart?status=cancelled`,
  };
}

export interface MarketingCheckoutDeps {
  pool: TxPool;
  getStripe: () => Stripe | null;
  getBaseUrl: () => string;
}

function describeError(err: any): string {
  const parts = [err?.type, err?.code, err?.statusCode, err?.message]
    .filter((part) => part !== undefined && part !== null && part !== "")
    .map((part) => redactStripeSecrets(part));
  return parts.join(" | ") || "unknown error";
}

/**
 * POST /api/marketing/cart/checkout. Expects req.user from requireAuth and the
 * payments gate to have run first. The request body is never read: prices,
 * quantities and return URLs all come from the database and configuration.
 */
export function createMarketingCheckoutHandler(
  deps: MarketingCheckoutDeps,
): RequestHandler {
  return async (req: Request, res) => {
    try {
      const stripe = deps.getStripe();
      if (!stripe) {
        res.status(503).json({
          success: false,
          error: "Stripe not configured",
          code: "STRIPE_NOT_CONFIGURED",
        });
        return;
      }

      const userId = req.user!.userId;
      const pricing = await priceCart(deps.pool, userId);
      if (!pricing.ok) {
        res.status(pricing.status).json({
          success: false,
          error: pricing.error,
          code: pricing.code,
          ...(pricing.items ? { items: pricing.items } : {}),
        });
        return;
      }

      const order = await createPendingOrder(
        deps.pool,
        userId,
        pricing.lines,
        pricing.totalCents,
      );

      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create(
          buildCheckoutSessionParams({
            lines: pricing.lines,
            orderId: order.id,
            userId,
            baseUrl: deps.getBaseUrl(),
          }),
          { idempotencyKey: `marketing-order-${order.id}` },
        );
        if (!session.url) {
          throw new Error("Stripe returned a checkout session without a URL");
        }
      } catch (err) {
        await deps.pool
          .query(
            `UPDATE orders
                SET status = 'cancelled', notes = $2, updated_at = NOW()
              WHERE id = $1 AND status = 'pending'`,
            [order.id, "Stripe checkout session could not be created"],
          )
          .catch(() => undefined);
        throw err;
      }

      await deps.pool.query(
        `UPDATE orders SET stripe_session_id = $1, updated_at = NOW() WHERE id = $2`,
        [session.id, order.id],
      );

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url,
          orderId: order.id,
        },
      });
    } catch (err) {
      console.error("[MARKETING] Checkout error:", describeError(err));
      res.status(500).json({
        success: false,
        error: "Checkout could not be started. Please try again.",
        code: "CHECKOUT_FAILED",
      });
    }
  };
}

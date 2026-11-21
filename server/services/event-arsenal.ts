import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import {
  type EventArsenalItem,
  type EventArsenalKind,
  type EventArsenalOrderSummary,
  upsertArsenalItemSchema,
} from "@shared/event-arsenal";
import { ensureEventArsenalSchema } from "./event-arsenal-schema";
import type { TxClient, TxPool } from "./marketing-checkout";

export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }>;
}

const PASS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateEventPassCode(): string {
  const bytes = randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += PASS_ALPHABET[bytes[i]! % PASS_ALPHABET.length];
  }
  return `VA-EVT-${suffix}`;
}

export function mapArsenalItemRow(row: any): EventArsenalItem {
  const rawVariants = Array.isArray(row.variants)
    ? row.variants
    : typeof row.variants === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(row.variants);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
  return {
    id: Number(row.id),
    eventId: Number(row.event_id),
    kind: (String(row.kind || "TICKET").toUpperCase() as EventArsenalKind),
    name: String(row.name || ""),
    description: String(row.description || ""),
    priceCents: Number(row.price_cents || 0),
    stockLimit:
      row.stock_limit === null || row.stock_limit === undefined
        ? null
        : Number(row.stock_limit),
    soldCount: Number(row.sold_count || 0),
    maxPerOrder: Number(row.max_per_order || 6),
    imageUrl: row.image_url ? String(row.image_url) : null,
    badge: row.badge ? String(row.badge) : null,
    variants: rawVariants.map((v: unknown) => String(v)).filter(Boolean),
    fulfillmentNote: row.fulfillment_note ? String(row.fulfillment_note) : null,
    sortOrder: Number(row.sort_order || 0),
    active: row.active !== false,
  };
}

export async function listEventArsenalItems(
  db: Queryable & { connect?: any },
  eventId: number,
  opts: { includeInactive?: boolean } = {},
): Promise<EventArsenalItem[]> {
  await ensureEventArsenalSchema(db);
  const result = await db.query(
    `SELECT * FROM event_arsenal_items
      WHERE event_id = $1 ${opts.includeInactive ? "" : "AND active = TRUE"}
      ORDER BY
        CASE kind WHEN 'TICKET' THEN 0 WHEN 'MERCH' THEN 1 ELSE 2 END ASC,
        sort_order ASC,
        id ASC`,
    [eventId],
  );
  return result.rows.map(mapArsenalItemRow);
}

export async function createEventArsenalItem(
  db: Queryable & { connect?: any },
  eventId: number,
  rawBody: unknown,
): Promise<{ ok: true; item: EventArsenalItem } | { ok: false; error: string }> {
  const parsed = upsertArsenalItemSchema.safeParse(rawBody);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message || "Invalid arsenal item" };
  }
  await ensureEventArsenalSchema(db);
  const v = parsed.data;
  const inserted = await db.query(
    `INSERT INTO event_arsenal_items
       (event_id, kind, name, description, price_cents, stock_limit,
        max_per_order, image_url, badge, variants, fulfillment_note,
        sort_order, active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, NOW())
     RETURNING *`,
    [
      eventId,
      v.kind,
      v.name,
      v.description,
      v.priceCents,
      v.stockLimit,
      v.maxPerOrder,
      v.imageUrl,
      v.badge,
      JSON.stringify(v.variants),
      v.fulfillmentNote,
      v.sortOrder,
      v.active,
    ],
  );
  return { ok: true, item: mapArsenalItemRow(inserted.rows[0]) };
}

export async function updateEventArsenalItem(
  db: Queryable & { connect?: any },
  eventId: number,
  itemId: number,
  rawBody: unknown,
): Promise<{ ok: true; item: EventArsenalItem } | { ok: false; error: string; status?: number }> {
  const parsed = upsertArsenalItemSchema.safeParse(rawBody);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message || "Invalid arsenal item", status: 400 };
  }
  await ensureEventArsenalSchema(db);
  const v = parsed.data;
  const updated = await db.query(
    `UPDATE event_arsenal_items
        SET kind = $1,
            name = $2,
            description = $3,
            price_cents = $4,
            stock_limit = $5,
            max_per_order = $6,
            image_url = $7,
            badge = $8,
            variants = $9::jsonb,
            fulfillment_note = $10,
            sort_order = $11,
            active = $12,
            updated_at = NOW()
      WHERE id = $13 AND event_id = $14
      RETURNING *`,
    [
      v.kind,
      v.name,
      v.description,
      v.priceCents,
      v.stockLimit,
      v.maxPerOrder,
      v.imageUrl,
      v.badge,
      JSON.stringify(v.variants),
      v.fulfillmentNote,
      v.sortOrder,
      v.active,
      itemId,
      eventId,
    ],
  );
  if (!updated.rows.length) {
    return { ok: false, error: "Arsenal item not found", status: 404 };
  }
  return { ok: true, item: mapArsenalItemRow(updated.rows[0]) };
}

export async function deleteEventArsenalItem(
  db: Queryable & { connect?: any },
  eventId: number,
  itemId: number,
): Promise<boolean> {
  await ensureEventArsenalSchema(db);
  const removed = await db.query(
    `DELETE FROM event_arsenal_items WHERE id = $1 AND event_id = $2 RETURNING id`,
    [itemId, eventId],
  );
  return removed.rows.length > 0;
}

export async function listUserEventArsenalOrders(
  db: Queryable & { connect?: any },
  userId: number,
  eventId: number,
): Promise<EventArsenalOrderSummary[]> {
  await ensureEventArsenalSchema(db);
  const ordersRes = await db.query(
    `SELECT * FROM event_arsenal_orders
      WHERE user_id = $1 AND event_id = $2 AND status = 'paid'
      ORDER BY paid_at DESC NULLS LAST, id DESC`,
    [userId, eventId],
  );
  if (!ordersRes.rows.length) return [];
  const orderIds = ordersRes.rows.map((r) => Number(r.id));
  const itemsRes = await db.query(
    `SELECT * FROM event_arsenal_order_items
      WHERE order_id = ANY($1::int[])
      ORDER BY id ASC`,
    [orderIds],
  );
  const byOrder = new Map<number, EventArsenalOrderSummary["items"]>();
  for (const row of itemsRes.rows) {
    const oid = Number(row.order_id);
    const arr = byOrder.get(oid) ?? [];
    arr.push({
      id: Number(row.id),
      itemId: row.item_id === null ? null : Number(row.item_id),
      kind: String(row.kind || "TICKET").toUpperCase() as EventArsenalKind,
      itemName: String(row.item_name || ""),
      variant: row.variant ? String(row.variant) : null,
      quantity: Number(row.quantity || 1),
      unitPriceCents: Number(row.unit_price_cents || 0),
      lineTotalCents: Number(row.line_total_cents || 0),
    });
    byOrder.set(oid, arr);
  }
  return ordersRes.rows.map((row) => ({
    id: Number(row.id),
    eventId: Number(row.event_id),
    userId: Number(row.user_id),
    passCode: String(row.pass_code),
    status: String(row.status),
    totalCents: Number(row.total_cents || 0),
    currency: String(row.currency || "CAD"),
    hasTicket: Boolean(row.has_ticket),
    ticketQty: Number(row.ticket_qty || 0),
    merchQty: Number(row.merch_qty || 0),
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).toISOString() : null,
    merchFulfilledAt: row.merch_fulfilled_at
      ? new Date(row.merch_fulfilled_at).toISOString()
      : null,
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    items: byOrder.get(Number(row.id)) ?? [],
  }));
}

export async function listEventBoxOfficeOrders(
  db: Queryable & { connect?: any },
  eventId: number,
): Promise<EventArsenalOrderSummary[]> {
  await ensureEventArsenalSchema(db);
  const ordersRes = await db.query(
    `SELECT o.*,
            COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), u.email) AS buyer_name,
            u.email AS buyer_email
       FROM event_arsenal_orders o
       LEFT JOIN users u ON u.id = o.user_id
      WHERE o.event_id = $1 AND o.status IN ('paid', 'refunded', 'disputed', 'chargeback')
      ORDER BY o.paid_at DESC NULLS LAST, o.id DESC
      LIMIT 250`,
    [eventId],
  );
  if (!ordersRes.rows.length) return [];
  const orderIds = ordersRes.rows.map((r) => Number(r.id));
  const itemsRes = await db.query(
    `SELECT * FROM event_arsenal_order_items
      WHERE order_id = ANY($1::int[])
      ORDER BY id ASC`,
    [orderIds],
  );
  const byOrder = new Map<number, EventArsenalOrderSummary["items"]>();
  for (const row of itemsRes.rows) {
    const oid = Number(row.order_id);
    const arr = byOrder.get(oid) ?? [];
    arr.push({
      id: Number(row.id),
      itemId: row.item_id === null ? null : Number(row.item_id),
      kind: String(row.kind || "TICKET").toUpperCase() as EventArsenalKind,
      itemName: String(row.item_name || ""),
      variant: row.variant ? String(row.variant) : null,
      quantity: Number(row.quantity || 1),
      unitPriceCents: Number(row.unit_price_cents || 0),
      lineTotalCents: Number(row.line_total_cents || 0),
    });
    byOrder.set(oid, arr);
  }
  return ordersRes.rows.map((row) => ({
    id: Number(row.id),
    eventId: Number(row.event_id),
    userId: Number(row.user_id),
    buyerName: row.buyer_name ? String(row.buyer_name) : `Guest #${row.user_id}`,
    buyerEmail: row.buyer_email ? String(row.buyer_email) : undefined,
    passCode: String(row.pass_code),
    status: String(row.status),
    totalCents: Number(row.total_cents || 0),
    currency: String(row.currency || "CAD"),
    hasTicket: Boolean(row.has_ticket),
    ticketQty: Number(row.ticket_qty || 0),
    merchQty: Number(row.merch_qty || 0),
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at).toISOString() : null,
    merchFulfilledAt: row.merch_fulfilled_at
      ? new Date(row.merch_fulfilled_at).toISOString()
      : null,
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    items: byOrder.get(Number(row.id)) ?? [],
  }));
}

export type PreparedArsenalOrderResult =
  | {
      ok: true;
      mode: "free_completed";
      order: EventArsenalOrderSummary;
    }
  | {
      ok: true;
      mode: "stripe_checkout";
      orderId: number;
      passCode: string;
      eventId: number;
      eventSlug: string;
      eventTitle: string;
      totalCents: number;
      needsShipping: boolean;
      stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    }
  | {
      ok: false;
      status: number;
      code?: string;
      error: string;
    };

export async function prepareArsenalOrder(
  db: Queryable & { connect?: any },
  input: {
    userId: number;
    eventId: number;
    lines: Array<{ itemId: number; quantity: number; variant?: string | null }>;
    allowPaidCheckout: boolean;
  },
): Promise<PreparedArsenalOrderResult> {
  await ensureEventArsenalSchema(db);

  const evRes = await db.query(
    `SELECT id, slug, title, capacity,
            (COALESCE(ends_at, starts_at) < NOW()) AS ended,
            (SELECT COUNT(*)::int FROM event_attendees ea
              WHERE ea.event_id = events.id AND ea.status = 'GOING') AS attendee_count
       FROM events
      WHERE id = $1 AND status = 'PUBLISHED'`,
    [input.eventId],
  );
  if (!evRes.rows.length) {
    return { ok: false, status: 404, error: "Published event not found" };
  }
  const eventRow = evRes.rows[0];
  if (eventRow.ended) {
    return {
      ok: false,
      status: 409,
      code: "EVENT_ENDED",
      error: "This activity has already taken place.",
    };
  }

  const itemIds = [...new Set(input.lines.map((l) => l.itemId))];
  const itemsRes = await db.query(
    `SELECT * FROM event_arsenal_items
      WHERE event_id = $1 AND id = ANY($2::int[]) AND active = TRUE`,
    [input.eventId, itemIds],
  );
  const catalog = new Map<number, EventArsenalItem>();
  for (const r of itemsRes.rows) {
    const mapped = mapArsenalItemRow(r);
    catalog.set(mapped.id, mapped);
  }

  // Aggregate total requested per itemId to check stock_limit & max_per_order accurately
  const qtyByItem = new Map<number, number>();
  const resolvedLines: Array<{
    item: EventArsenalItem;
    quantity: number;
    variant: string | null;
    lineTotalCents: number;
  }> = [];

  for (const line of input.lines) {
    const item = catalog.get(line.itemId);
    if (!item) {
      return {
        ok: false,
        status: 400,
        error: "One of the selected arsenal items is no longer available.",
      };
    }
    const nextQty = (qtyByItem.get(item.id) ?? 0) + line.quantity;
    if (nextQty > item.maxPerOrder) {
      return {
        ok: false,
        status: 400,
        error: `Maximum ${item.maxPerOrder} allowed per order for "${item.name}".`,
      };
    }
    if (item.stockLimit !== null && item.soldCount + nextQty > item.stockLimit) {
      const remaining = Math.max(0, item.stockLimit - item.soldCount);
      return {
        ok: false,
        status: 409,
        code: "OUT_OF_STOCK",
        error:
          remaining === 0
            ? `"${item.name}" is sold out.`
            : `Only ${remaining} left for "${item.name}".`,
      };
    }
    let cleanVariant: string | null = line.variant?.trim() || null;
    if (item.variants.length > 0) {
      if (!cleanVariant || !item.variants.includes(cleanVariant)) {
        return {
          ok: false,
          status: 400,
          error: `Please select a valid option (${item.variants.join(", ")}) for "${item.name}".`,
        };
      }
    } else {
      cleanVariant = null;
    }

    qtyByItem.set(item.id, nextQty);
    resolvedLines.push({
      item,
      quantity: line.quantity,
      variant: cleanVariant,
      lineTotalCents: item.priceCents * line.quantity,
    });
  }

  let totalCents = 0;
  let ticketQty = 0;
  let merchQty = 0;
  for (const rl of resolvedLines) {
    totalCents += rl.lineTotalCents;
    if (rl.item.kind === "TICKET") ticketQty += rl.quantity;
    else merchQty += rl.quantity;
  }
  const hasTicket = ticketQty > 0;

  if (
    hasTicket &&
    eventRow.capacity !== null &&
    eventRow.capacity !== undefined &&
    Number(eventRow.attendee_count || 0) + ticketQty > Number(eventRow.capacity)
  ) {
    return {
      ok: false,
      status: 409,
      code: "EVENT_AT_CAPACITY",
      error: "This event has reached its capacity limit.",
    };
  }

  if (totalCents === 0) {
    // Prevent duplicate free ticket claims by the same user
    const existingFree = await db.query(
      `SELECT 1 FROM event_arsenal_orders
        WHERE event_id = $1 AND user_id = $2 AND status = 'paid' AND total_cents = 0
        LIMIT 1`,
      [input.eventId, input.userId],
    );
    if (existingFree.rows.length > 0) {
      return {
        ok: false,
        status: 409,
        code: "ALREADY_REGISTERED",
        error: "You already claimed a free pass for this event.",
      };
    }

    const passCode = generateEventPassCode();
    const orderIns = await db.query(
      `INSERT INTO event_arsenal_orders
         (event_id, user_id, pass_code, status, total_cents, currency,
          has_ticket, ticket_qty, merch_qty, paid_at, updated_at)
       VALUES ($1, $2, $3, 'paid', 0, 'CAD', $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [input.eventId, input.userId, passCode, hasTicket, ticketQty, merchQty],
    );
    const orderRow = orderIns.rows[0];
    const orderItems: EventArsenalOrderSummary["items"] = [];
    for (const rl of resolvedLines) {
      const lineIns = await db.query(
        `INSERT INTO event_arsenal_order_items
           (order_id, item_id, kind, item_name, variant, quantity, unit_price_cents, line_total_cents)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          orderRow.id,
          rl.item.id,
          rl.item.kind,
          rl.item.name,
          rl.variant,
          rl.quantity,
          rl.item.priceCents,
          rl.lineTotalCents,
        ],
      );
      await db.query(
        `UPDATE event_arsenal_items
            SET sold_count = sold_count + $1, updated_at = NOW()
          WHERE id = $2`,
        [rl.quantity, rl.item.id],
      );
      orderItems.push({
        id: Number(lineIns.rows[0].id),
        itemId: rl.item.id,
        kind: rl.item.kind,
        itemName: rl.item.name,
        variant: rl.variant,
        quantity: rl.quantity,
        unitPriceCents: rl.item.priceCents,
        lineTotalCents: rl.lineTotalCents,
      });
    }
    if (hasTicket) {
      await db.query(
        `INSERT INTO event_attendees (event_id, user_id, status, updated_at)
         VALUES ($1, $2, 'GOING', NOW())
         ON CONFLICT (event_id, user_id)
         DO UPDATE SET status = 'GOING', updated_at = NOW()`,
        [input.eventId, input.userId],
      );
    }

    return {
      ok: true,
      mode: "free_completed",
      order: {
        id: Number(orderRow.id),
        eventId: input.eventId,
        userId: input.userId,
        passCode,
        status: "paid",
        totalCents: 0,
        currency: "CAD",
        hasTicket,
        ticketQty,
        merchQty,
        checkedInAt: null,
        merchFulfilledAt: null,
        paidAt: new Date(orderRow.paid_at).toISOString(),
        createdAt: new Date(orderRow.created_at).toISOString(),
        items: orderItems,
      },
    };
  }

  if (!input.allowPaidCheckout) {
    return {
      ok: false,
      status: 503,
      code: "ONLINE_PAYMENTS_UNAVAILABLE",
      error: "Online card checkout is not currently enabled.",
    };
  }

  const passCode = generateEventPassCode();
  const pendingIns = await db.query(
    `INSERT INTO event_arsenal_orders
       (event_id, user_id, pass_code, status, total_cents, currency,
        has_ticket, ticket_qty, merch_qty, updated_at)
     VALUES ($1, $2, $3, 'pending', $4, 'CAD', $5, $6, $7, NOW())
     RETURNING id`,
    [
      input.eventId,
      input.userId,
      passCode,
      totalCents,
      hasTicket,
      ticketQty,
      merchQty,
    ],
  );
  const orderId = Number(pendingIns.rows[0].id);

  // Note: Stripe rejects CA$0.00 line_items on paid sessions unless handled carefully;
  // if a buyer mixes a free RSVP tier + paid Merch in one bag, roll the free pass note
  // into metadata & order_items and send paid line_items to Stripe so amount_total matches totalCents!
  const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const rl of resolvedLines) {
    await db.query(
      `INSERT INTO event_arsenal_order_items
         (order_id, item_id, kind, item_name, variant, quantity, unit_price_cents, line_total_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        orderId,
        rl.item.id,
        rl.item.kind,
        rl.item.name,
        rl.variant,
        rl.quantity,
        rl.item.priceCents,
        rl.lineTotalCents,
      ],
    );
    if (rl.item.priceCents > 0) {
      const variantLabel = rl.variant ? ` (${rl.variant})` : "";
      stripeLineItems.push({
        price_data: {
          currency: "cad",
          product_data: {
            name: `${String(eventRow.title)} — ${rl.item.name}${variantLabel}`,
            description:
              rl.item.fulfillmentNote ||
              rl.item.description ||
              `${rl.item.kind} for ${String(eventRow.title)}`,
          },
          unit_amount: rl.item.priceCents,
        },
        quantity: rl.quantity,
      });
    }
  }

  const needsShipping = resolvedLines.some(
    (rl) =>
      rl.item.kind === "MERCH" &&
      rl.item.fulfillmentNote &&
      /ship/i.test(rl.item.fulfillmentNote),
  );

  return {
    ok: true,
    mode: "stripe_checkout",
    orderId,
    passCode,
    eventId: input.eventId,
    eventSlug: String(eventRow.slug || input.eventId),
    eventTitle: String(eventRow.title),
    totalCents,
    needsShipping,
    stripeLineItems,
  };
}

export async function fulfillArsenalOrderInTx(
  client: TxClient,
  params: {
    userId: number;
    arsenalOrderId: number;
    sessionId: string;
    paidCents: number;
    shippingNote: string | null;
  },
): Promise<{ fulfilled: boolean; mismatch?: string }> {
  await ensureEventArsenalSchema(client as any);
  const found = await client.query(
    `SELECT id, event_id, status, total_cents, has_ticket
       FROM event_arsenal_orders
      WHERE id = $1 AND user_id = $2
      FOR UPDATE`,
    [params.arsenalOrderId, params.userId],
  );
  const order = found.rows[0];
  if (!order) return { fulfilled: false, mismatch: "order_not_found" };
  if (order.status !== "pending") {
    return { fulfilled: false, mismatch: "order_not_pending" };
  }
  if (Number(order.total_cents) !== params.paidCents) {
    return { fulfilled: false, mismatch: "amount_mismatch" };
  }

  await client.query(
    `UPDATE event_arsenal_orders
        SET status = 'paid',
            stripe_session_id = $1,
            paid_at = NOW(),
            notes = CASE WHEN $3::text IS NOT NULL THEN COALESCE(notes || E'\\n', '') || $3 ELSE notes END,
            updated_at = NOW()
      WHERE id = $2`,
    [params.sessionId, params.arsenalOrderId, params.shippingNote],
  );

  const lines = await client.query(
    `SELECT item_id, quantity FROM event_arsenal_order_items WHERE order_id = $1`,
    [params.arsenalOrderId],
  );
  for (const line of lines.rows) {
    if (line.item_id != null) {
      await client.query(
        `UPDATE event_arsenal_items
            SET sold_count = sold_count + $1, updated_at = NOW()
          WHERE id = $2`,
        [Number(line.quantity || 1), Number(line.item_id)],
      );
    }
  }

  if (order.has_ticket) {
    await client.query(
      `INSERT INTO event_attendees (event_id, user_id, status, updated_at)
       VALUES ($1, $2, 'GOING', NOW())
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET status = 'GOING', updated_at = NOW()`,
      [Number(order.event_id), params.userId],
    );
  }

  return { fulfilled: true };
}

export async function reverseArsenalOrderInTx(
  client: TxClient,
  sessionId: string,
  nextStatus: "refunded" | "disputed" | "chargeback" | "paid",
  note: string,
  withdrawAccess: boolean,
): Promise<boolean> {
  await ensureEventArsenalSchema(client as any);
  const updated = await client.query(
    `UPDATE event_arsenal_orders
        SET status = $2,
            notes = COALESCE(notes || E'\\n', '') || $3,
            updated_at = NOW()
      WHERE stripe_session_id = $1
      RETURNING id, event_id, user_id, has_ticket`,
    [sessionId, nextStatus, note],
  );
  const order = updated.rows[0];
  if (!order) return false;

  if (withdrawAccess) {
    const lines = await client.query(
      `SELECT item_id, quantity FROM event_arsenal_order_items WHERE order_id = $1`,
      [Number(order.id)],
    );
    for (const line of lines.rows) {
      if (line.item_id != null) {
        await client.query(
          `UPDATE event_arsenal_items
              SET sold_count = GREATEST(0, sold_count - $1), updated_at = NOW()
            WHERE id = $2`,
          [Number(line.quantity || 1), Number(line.item_id)],
        );
      }
    }
    if (order.has_ticket) {
      await client.query(
        `UPDATE event_attendees
            SET status = 'CANCELLED', updated_at = NOW()
          WHERE event_id = $1 AND user_id = $2 AND status = 'GOING'
            AND NOT EXISTS (
              SELECT 1 FROM event_arsenal_orders
               WHERE event_id = $1 AND user_id = $2 AND status = 'paid' AND has_ticket = TRUE
            )`,
        [Number(order.event_id), Number(order.user_id)],
      );
    }
  }
  return true;
}

export type unusedPoolRef = TxPool;

/**
 * Admin-priced one-time offers (community membership, activity tickets).
 * Prices live in the database so staff can change them without a deploy; the
 * checkout route always reads the amount from here, never from the client.
 */
export interface QueryRunner {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

export interface PaidOffer {
  key: string;
  name: string;
  description: string;
  amountCents: number;
  active: boolean;
}

export const MIN_OFFER_CENTS = 100;
export const MAX_OFFER_CENTS = 50_000;

export const DEFAULT_PAID_OFFERS: PaidOffer[] = [
  {
    key: "community_join",
    name: "Community membership",
    description: "Join the Verso Air community.",
    amountCents: 500,
    active: true,
  },
  {
    key: "activity_ticket",
    name: "Activity ticket",
    description: "Reserve your place at a Verso Air activity.",
    amountCents: 1000,
    active: true,
  },
  {
    key: "event_host_fee",
    name: "Event hosting fee",
    description:
      "Host and publish an event with its ticket and merch arsenal on Verso Air.",
    amountCents: 2500,
    active: true,
  },
];

export function isPaidOfferKey(value: unknown): value is string {
  return (
    typeof value === "string" && DEFAULT_PAID_OFFERS.some((o) => o.key === value)
  );
}

const TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS paid_offers (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS paid_offer_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    offer_key TEXT NOT NULL,
    event_id INTEGER,
    stripe_session_id TEXT NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
];

let ready: Promise<void> | null = null;

export async function ensurePaidOfferTables(db: QueryRunner): Promise<void> {
  for (const sql of TABLES_SQL) await db.query(sql);
  for (const offer of DEFAULT_PAID_OFFERS) {
    await db.query(
      `INSERT INTO paid_offers (key, name, description, amount_cents, active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO NOTHING`,
      [offer.key, offer.name, offer.description, offer.amountCents, offer.active],
    );
  }
}

/** Creates the tables once per process; a failure is retried on the next call. */
export function ensurePaidOffersReady(db: QueryRunner): Promise<void> {
  if (!ready) {
    ready = ensurePaidOfferTables(db).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

function toOffer(row: any): PaidOffer {
  return {
    key: row.key,
    name: row.name,
    description: row.description,
    amountCents: Number(row.amount_cents),
    active: row.active === true,
  };
}

export async function listPaidOffers(
  db: QueryRunner,
  opts: { includeInactive?: boolean } = {},
): Promise<PaidOffer[]> {
  await ensurePaidOffersReady(db);
  const result = await db.query(
    `SELECT key, name, description, amount_cents, active FROM paid_offers
      ${opts.includeInactive ? "" : "WHERE active = TRUE"}
      ORDER BY key`,
  );
  return result.rows.map(toOffer);
}

export async function getPaidOffer(
  db: QueryRunner,
  key: string,
): Promise<PaidOffer | null> {
  await ensurePaidOffersReady(db);
  const result = await db.query(
    `SELECT key, name, description, amount_cents, active FROM paid_offers WHERE key = $1`,
    [key],
  );
  return result.rows[0] ? toOffer(result.rows[0]) : null;
}

/** True when the user already holds the offer; for a ticket, for that event. */
export async function hasPurchasedOffer(
  db: QueryRunner,
  userId: number,
  offerKey: string,
  eventId: number | null = null,
): Promise<boolean> {
  await ensurePaidOffersReady(db);
  const params: unknown[] = [userId, offerKey];
  let sql = `SELECT 1 FROM paid_offer_purchases WHERE user_id = $1 AND offer_key = $2`;
  if (eventId !== null) {
    params.push(eventId);
    sql += ` AND event_id = $3`;
  }
  const result = await db.query(`${sql} LIMIT 1`, params);
  return result.rows.length > 0;
}

/**
 * Withdraws what a refunded or charged-back payment bought: the purchase and,
 * for a ticket, the attendance it paid for. A second payment for the same
 * ticket keeps the attendance. The purchase table must already exist, which
 * holds for any session recorded as a paid offer.
 */
export async function revokePaidOfferPurchase(
  db: QueryRunner,
  sessionId: string,
): Promise<boolean> {
  const removed = await db.query(
    `DELETE FROM paid_offer_purchases WHERE stripe_session_id = $1
     RETURNING user_id, offer_key, event_id`,
    [sessionId],
  );
  const purchase = removed.rows[0];
  if (!purchase) return false;
  if (purchase.offer_key === "activity_ticket" && purchase.event_id != null) {
    await db.query(
      `UPDATE event_attendees SET status = 'CANCELLED', updated_at = NOW()
        WHERE event_id = $1 AND user_id = $2 AND status = 'GOING'
          AND NOT EXISTS (
            SELECT 1 FROM paid_offer_purchases
             WHERE user_id = $2 AND offer_key = 'activity_ticket' AND event_id = $1
          )`,
      [purchase.event_id, purchase.user_id],
    );
  }
  if (purchase.offer_key === "event_host_fee" && purchase.event_id != null) {
    await db.query(
      `UPDATE events
          SET status = CASE WHEN status IN ('PENDING', 'PUBLISHED') THEN 'DRAFT' ELSE status END,
              updated_at = NOW()
        WHERE id = $1 AND organizer_id = $2
          AND NOT EXISTS (
            SELECT 1 FROM paid_offer_purchases
             WHERE user_id = $2 AND offer_key = 'event_host_fee' AND event_id = $1
          )`,
      [purchase.event_id, purchase.user_id],
    );
  }
  return true;
}

export type OfferUpdate = { amountCents?: unknown; active?: unknown };

export function validateOfferUpdate(
  body: OfferUpdate,
): { ok: true; amountCents?: number; active?: boolean } | { ok: false; error: string } {
  const out: { amountCents?: number; active?: boolean } = {};
  if (body.amountCents !== undefined) {
    const cents = body.amountCents;
    if (
      typeof cents !== "number" ||
      !Number.isInteger(cents) ||
      cents < MIN_OFFER_CENTS ||
      cents > MAX_OFFER_CENTS
    ) {
      return {
        ok: false,
        error: `amountCents must be a whole number between ${MIN_OFFER_CENTS} and ${MAX_OFFER_CENTS}`,
      };
    }
    out.amountCents = cents;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return { ok: false, error: "active must be true or false" };
    }
    out.active = body.active;
  }
  if (out.amountCents === undefined && out.active === undefined) {
    return { ok: false, error: "Nothing to update" };
  }
  return { ok: true, ...out };
}

export async function updatePaidOffer(
  db: QueryRunner,
  key: string,
  update: { amountCents?: number; active?: boolean },
): Promise<PaidOffer | null> {
  await ensurePaidOffersReady(db);
  const result = await db.query(
    `UPDATE paid_offers
        SET amount_cents = COALESCE($2, amount_cents),
            active = COALESCE($3, active),
            updated_at = NOW()
      WHERE key = $1
      RETURNING key, name, description, amount_cents, active`,
    [key, update.amountCents ?? null, update.active ?? null],
  );
  return result.rows[0] ? toOffer(result.rows[0]) : null;
}

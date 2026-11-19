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

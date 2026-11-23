/**
 * Lazy schema for Event Arsenal (per-event Ticket Tiers, Merch Drops, VIP Add-ons,
 * orders, and Digital Door Pass check-in).
 * Runs once per database pool under pg_advisory_xact_lock; migrations/0014_event_arsenal.sql
 * carries the identical DDL.
 */

export const EVENT_ARSENAL_SCHEMA_LOCK_KEY = 74319042;

export const EVENT_ARSENAL_SCHEMA_STATEMENTS: readonly string[] = [
  `ALTER TABLE public.events
     ADD COLUMN IF NOT EXISTS theme_accent VARCHAR(24) NOT NULL DEFAULT 'amber'`,
  `ALTER TABLE public.events
     ADD COLUMN IF NOT EXISTS capacity INTEGER`,
  `CREATE TABLE IF NOT EXISTS public.event_arsenal_items (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL DEFAULT 'TICKET',
    name VARCHAR(160) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL DEFAULT 0,
    stock_limit INTEGER,
    sold_count INTEGER NOT NULL DEFAULT 0,
    max_per_order SMALLINT NOT NULL DEFAULT 6,
    image_url TEXT,
    badge VARCHAR(60),
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    fulfillment_note VARCHAR(220),
    sort_order SMALLINT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT event_arsenal_items_kind_check
      CHECK (kind IN ('TICKET', 'MERCH', 'ADDON')),
    CONSTRAINT event_arsenal_items_price_check
      CHECK (price_cents >= 0 AND price_cents <= 500000),
    CONSTRAINT event_arsenal_items_stock_check
      CHECK (stock_limit IS NULL OR stock_limit >= 0),
    CONSTRAINT event_arsenal_items_sold_check
      CHECK (sold_count >= 0),
    CONSTRAINT event_arsenal_items_max_order_check
      CHECK (max_per_order BETWEEN 1 AND 20)
  )`,
  `CREATE INDEX IF NOT EXISTS event_arsenal_items_event_sort_idx
    ON public.event_arsenal_items (event_id, sort_order, id)`,
  `CREATE TABLE IF NOT EXISTS public.event_arsenal_orders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    pass_code VARCHAR(32) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'CAD',
    has_ticket BOOLEAN NOT NULL DEFAULT FALSE,
    ticket_qty INTEGER NOT NULL DEFAULT 0,
    merch_qty INTEGER NOT NULL DEFAULT 0,
    stripe_session_id TEXT UNIQUE,
    checked_in_at TIMESTAMPTZ,
    merch_fulfilled_at TIMESTAMPTZ,
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT event_arsenal_orders_status_check
      CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'disputed', 'chargeback')),
    CONSTRAINT event_arsenal_orders_total_check
      CHECK (total_cents >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS event_arsenal_orders_event_status_idx
    ON public.event_arsenal_orders (event_id, status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS event_arsenal_orders_user_event_idx
    ON public.event_arsenal_orders (user_id, event_id)`,
  `CREATE TABLE IF NOT EXISTS public.event_arsenal_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES public.event_arsenal_orders(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES public.event_arsenal_items(id) ON DELETE SET NULL,
    kind VARCHAR(20) NOT NULL,
    item_name VARCHAR(160) NOT NULL,
    variant VARCHAR(60),
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    line_total_cents INTEGER NOT NULL,
    CONSTRAINT event_arsenal_order_items_qty_check CHECK (quantity >= 1),
    CONSTRAINT event_arsenal_order_items_price_check CHECK (unit_price_cents >= 0 AND line_total_cents >= 0)
  )`,
  `CREATE INDEX IF NOT EXISTS event_arsenal_order_items_order_idx
    ON public.event_arsenal_order_items (order_id)`,
];

export interface EventArsenalSchemaClient {
  query(text: string, values?: unknown[]): Promise<unknown>;
  release?(error?: Error | boolean): void;
}

export interface EventArsenalSchemaPool {
  connect?(): Promise<EventArsenalSchemaClient>;
  query?(text: string, values?: unknown[]): Promise<unknown>;
}

let ensured = new WeakMap<object, Promise<void>>();

export function resetEventArsenalSchemaForTests(): void {
  ensured = new WeakMap<object, Promise<void>>();
}

export function ensureEventArsenalSchema(
  poolOrClient: EventArsenalSchemaPool,
): Promise<void> {
  const cached = ensured.get(poolOrClient);
  if (cached) return cached;

  const attempt = runEnsure(poolOrClient).catch((error) => {
    ensured.delete(poolOrClient);
    throw error;
  });
  ensured.set(poolOrClient, attempt);
  return attempt;
}

async function runEnsure(poolOrClient: EventArsenalSchemaPool): Promise<void> {
  if (typeof poolOrClient.connect === "function") {
    const client = await poolOrClient.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [
        EVENT_ARSENAL_SCHEMA_LOCK_KEY,
      ]);
      for (const statement of EVENT_ARSENAL_SCHEMA_STATEMENTS) {
        await client.query(statement);
      }
      await client.query("COMMIT");
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      try {
        await client.query("ROLLBACK");
      } catch {
        // Discarded below
      }
      client.release?.(failure);
      throw failure;
    }
    client.release?.();
    return;
  }

  if (typeof poolOrClient.query === "function") {
    for (const statement of EVENT_ARSENAL_SCHEMA_STATEMENTS) {
      await poolOrClient.query(statement);
    }
  }
}

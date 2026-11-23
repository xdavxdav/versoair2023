ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS theme_accent VARCHAR(24) NOT NULL DEFAULT 'amber';
--> statement-breakpoint
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS capacity INTEGER;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.event_arsenal_items (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS event_arsenal_items_event_sort_idx
  ON public.event_arsenal_items (event_id, sort_order, id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.event_arsenal_orders (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS event_arsenal_orders_event_status_idx
  ON public.event_arsenal_orders (event_id, status, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS event_arsenal_orders_user_event_idx
  ON public.event_arsenal_orders (user_id, event_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.event_arsenal_order_items (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS event_arsenal_order_items_order_idx
  ON public.event_arsenal_order_items (order_id);

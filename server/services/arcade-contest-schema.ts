/**
 * Country arcade contests: per-country config, play-time purchases, an
 * append-only money ledger, votes, seasons and artist payouts.
 *
 * Created lazily under pg_advisory_xact_lock, like the other money tables.
 * Every contest is seeded DISABLED; staff switch a country on after its own
 * legal review. Nothing here touches the casual arcade score tables.
 */

export const ARCADE_CONTEST_SCHEMA_LOCK_KEY = 74319042;

export const ARCADE_CONTEST_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS public.arcade_contests (
  country_code CHAR(2) PRIMARY KEY,
  currency CHAR(3) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  price_minor INTEGER NOT NULL CHECK (price_minor > 0),
  votes_per_hour INTEGER NOT NULL DEFAULT 10 CHECK (votes_per_hour >= 0),
  max_votes_per_artist_per_day INTEGER NOT NULL DEFAULT 5
    CHECK (max_votes_per_artist_per_day > 0),
  pool_bps INTEGER NOT NULL DEFAULT 7000 CHECK (pool_bps BETWEEN 0 AND 10000),
  vote_weight_bps INTEGER NOT NULL DEFAULT 6000
    CHECK (vote_weight_bps BETWEEN 0 AND 10000),
  stream_weight_bps INTEGER NOT NULL DEFAULT 4000
    CHECK (stream_weight_bps BETWEEN 0 AND 10000),
  escrow_days INTEGER NOT NULL DEFAULT 30 CHECK (escrow_days >= 0),
  min_payout_minor INTEGER NOT NULL DEFAULT 1000 CHECK (min_payout_minor >= 0),
  updated_by INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT arcade_contests_weights_check
    CHECK (vote_weight_bps + stream_weight_bps = 10000)
)`,
  `INSERT INTO public.arcade_contests (country_code, currency, price_minor, min_payout_minor)
VALUES ('CA', 'CAD', 500, 1000), ('CI', 'XOF', 2000, 5000)
ON CONFLICT (country_code) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS public.arcade_contest_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users (id),
  country_code CHAR(2) NOT NULL REFERENCES public.arcade_contests (country_code),
  currency CHAR(3) NOT NULL,
  hours INTEGER NOT NULL CHECK (hours BETWEEN 1 AND 24),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  votes_granted INTEGER NOT NULL CHECK (votes_granted >= 0),
  pool_bps INTEGER NOT NULL CHECK (pool_bps BETWEEN 0 AND 10000),
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','cancelled','refunded','disputed','chargeback')),
  stripe_session_id TEXT UNIQUE,
  season_key CHAR(7),
  pool_minor INTEGER,
  platform_minor INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
)`,
  `CREATE INDEX IF NOT EXISTS arcade_contest_purchases_user_idx
  ON public.arcade_contest_purchases (user_id, country_code, season_key, status)`,
  `CREATE TABLE IF NOT EXISTS public.arcade_contest_ledger (
  id BIGSERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  currency CHAR(3) NOT NULL,
  season_key CHAR(7) NOT NULL,
  kind VARCHAR(24) NOT NULL CHECK (kind IN (
    'pool_credit','platform_credit','pool_reversal','platform_reversal',
    'distribution','carry_out','carry_in','payout_paid')),
  amount_minor BIGINT NOT NULL,
  ref TEXT NOT NULL UNIQUE,
  purchase_id INTEGER,
  artist_id INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
  `CREATE INDEX IF NOT EXISTS arcade_contest_ledger_season_idx
  ON public.arcade_contest_ledger (country_code, season_key, kind)`,
  `CREATE OR REPLACE FUNCTION public.arcade_contest_ledger_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'arcade_contest_ledger is append-only';
END;
$$`,
  `CREATE OR REPLACE TRIGGER arcade_contest_ledger_append_only
BEFORE UPDATE OR DELETE ON public.arcade_contest_ledger
FOR EACH ROW EXECUTE FUNCTION public.arcade_contest_ledger_immutable()`,
  `CREATE TABLE IF NOT EXISTS public.arcade_contest_votes (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users (id),
  artist_id INTEGER NOT NULL REFERENCES public.artists (id),
  country_code CHAR(2) NOT NULL,
  season_key CHAR(7) NOT NULL,
  vote_day DATE NOT NULL,
  votes INTEGER NOT NULL CHECK (votes > 0),
  voided BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
  `CREATE INDEX IF NOT EXISTS arcade_contest_votes_user_idx
  ON public.arcade_contest_votes (user_id, country_code, season_key)`,
  `CREATE INDEX IF NOT EXISTS arcade_contest_votes_artist_idx
  ON public.arcade_contest_votes (country_code, season_key, artist_id)`,
  `CREATE TABLE IF NOT EXISTS public.arcade_contest_seasons (
  country_code CHAR(2) NOT NULL,
  season_key CHAR(7) NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by INTEGER,
  pool_minor BIGINT NOT NULL,
  carried_minor BIGINT NOT NULL,
  PRIMARY KEY (country_code, season_key)
)`,
  `CREATE TABLE IF NOT EXISTS public.arcade_contest_payouts (
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  season_key CHAR(7) NOT NULL,
  artist_id INTEGER NOT NULL REFERENCES public.artists (id),
  currency CHAR(3) NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  status VARCHAR(12) NOT NULL DEFAULT 'escrow'
    CHECK (status IN ('accrued','escrow','payable','paid','merged')),
  claim_deadline TIMESTAMPTZ NOT NULL,
  paid_reference TEXT,
  paid_at TIMESTAMPTZ,
  paid_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, season_key, artist_id)
)`,
];

export interface ArcadeContestSchemaClient {
  query(text: string, values?: unknown[]): Promise<unknown>;
  release(error?: Error | boolean): void;
}

export interface ArcadeContestSchemaPool {
  connect(): Promise<ArcadeContestSchemaClient>;
}

const ensured = new WeakMap<object, Promise<void>>();

export function ensureArcadeContestSchema(
  pool: ArcadeContestSchemaPool,
): Promise<void> {
  const cached = ensured.get(pool);
  if (cached) return cached;

  const attempt = runEnsure(pool).catch((error) => {
    ensured.delete(pool);
    throw error;
  });
  ensured.set(pool, attempt);
  return attempt;
}

async function runEnsure(pool: ArcadeContestSchemaPool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [
      ARCADE_CONTEST_SCHEMA_LOCK_KEY,
    ]);
    for (const statement of ARCADE_CONTEST_SCHEMA_STATEMENTS) {
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
    client.release(failure);
    throw failure;
  }
  client.release();
}

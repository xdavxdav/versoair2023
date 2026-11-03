/**
 * Schema for the Zapier automation outbox.
 *
 * Created lazily, and only when AUTOMATION_OUTBOX_ENABLED=true, so a DDL
 * mistake here can never block the production boot check. migrations/0008
 * carries the same statements for manual application.
 */

export const AUTOMATION_SCHEMA_LOCK_KEY = 74319031;

export const AUTOMATION_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS public.automation_outbox (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  category VARCHAR(40) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  topic VARCHAR(40) NOT NULL,
  market_id VARCHAR(20),
  country_code VARCHAR(2),
  timezone VARCHAR(64),
  priority VARCHAR(10) NOT NULL DEFAULT 'normal',
  entity_type VARCHAR(60),
  entity_id VARCHAR(120),
  payload JSONB NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ,
  last_error TEXT,
  last_http_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  dead_at TIMESTAMPTZ,
  payload_scrubbed_at TIMESTAMPTZ,
  CONSTRAINT automation_outbox_event_id_unique UNIQUE (event_id),
  CONSTRAINT automation_outbox_status_check
    CHECK (status IN ('pending', 'sent', 'acknowledged', 'dead'))
)`,
  `CREATE INDEX IF NOT EXISTS automation_outbox_due_idx
  ON public.automation_outbox (next_attempt_at, id)
  WHERE status = 'pending'`,
  `CREATE INDEX IF NOT EXISTS automation_outbox_status_created_idx
  ON public.automation_outbox (status, created_at)`,
  `CREATE TABLE IF NOT EXISTS public.automation_actions (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL,
  action_key VARCHAR(60) NOT NULL,
  actor VARCHAR(60) NOT NULL DEFAULT 'zapier',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT automation_actions_event_id_automation_outbox_event_id_fk
    FOREIGN KEY (event_id) REFERENCES public.automation_outbox (event_id) ON DELETE CASCADE,
  CONSTRAINT automation_actions_event_action_key UNIQUE (event_id, action_key)
)`,
];

export interface AutomationSchemaClient {
  query(text: string, values?: unknown[]): Promise<unknown>;
  release(error?: Error | boolean): void;
}

export interface AutomationSchemaPool {
  connect(): Promise<AutomationSchemaClient>;
}

const ensured = new WeakMap<object, Promise<void>>();

/** Idempotent and safe across instances: DDL runs in one transaction under an advisory lock. */
export function ensureAutomationSchema(pool: AutomationSchemaPool): Promise<void> {
  const cached = ensured.get(pool);
  if (cached) return cached;

  const attempt = runEnsure(pool).catch((error) => {
    ensured.delete(pool);
    throw error;
  });
  ensured.set(pool, attempt);
  return attempt;
}

async function runEnsure(pool: AutomationSchemaPool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [
      AUTOMATION_SCHEMA_LOCK_KEY,
    ]);
    for (const statement of AUTOMATION_SCHEMA_STATEMENTS) {
      await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    try {
      await client.query("ROLLBACK");
    } catch {
      // The connection is discarded below; the original failure is what matters.
    }
    client.release(failure);
    throw failure;
  }
  client.release();
}

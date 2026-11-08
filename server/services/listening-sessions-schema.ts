/**
 * Schema for listening sessions.
 *
 * Created lazily on the first request that needs it (never while the app
 * boots), so a DDL mistake here can never block startup or touch another
 * feature. migrations/0009 carries the same statements for manual application.
 * Everything is additive: nothing is ever dropped, truncated or deleted.
 */

export const LISTENING_SESSIONS_SCHEMA_LOCK_KEY = 74319032;

export const LISTENING_SESSIONS_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS public.listening_sessions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  host_user_id INTEGER,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  playlist_id INTEGER,
  status VARCHAR(16) NOT NULL DEFAULT 'scheduled',
  set_tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  gap_seconds SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT listening_sessions_host_user_id_users_id_fk
    FOREIGN KEY (host_user_id) REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT listening_sessions_playlist_id_playlists_id_fk
    FOREIGN KEY (playlist_id) REFERENCES public.playlists (id) ON DELETE SET NULL,
  CONSTRAINT listening_sessions_status_check
    CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  CONSTRAINT listening_sessions_window_check CHECK (ends_at > starts_at),
  CONSTRAINT listening_sessions_gap_check CHECK (gap_seconds >= 0 AND gap_seconds <= 300)
)`,
  `CREATE INDEX IF NOT EXISTS listening_sessions_starts_at_idx
  ON public.listening_sessions (starts_at)`,
];

export interface ListeningSessionsSchemaClient {
  query(text: string, values?: unknown[]): Promise<unknown>;
  release(error?: Error | boolean): void;
}

export interface ListeningSessionsSchemaPool {
  connect(): Promise<ListeningSessionsSchemaClient>;
}

const ensured = new WeakMap<object, Promise<void>>();

/** Idempotent and safe across instances: DDL runs in one transaction under an advisory lock. */
export function ensureListeningSessionsSchema(
  pool: ListeningSessionsSchemaPool,
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

async function runEnsure(pool: ListeningSessionsSchemaPool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [
      LISTENING_SESSIONS_SCHEMA_LOCK_KEY,
    ]);
    for (const statement of LISTENING_SESSIONS_SCHEMA_STATEMENTS) {
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

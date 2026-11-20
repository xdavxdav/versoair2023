/**
 * Lazy schema for casual arcade high scores (zero wallet/credits coupling).
 * Created lazily on first request under pg_advisory_xact_lock.
 */

export const ARCADE_SCORES_SCHEMA_LOCK_KEY = 74319041;

export const ARCADE_SCORES_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS public.arcade_scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game VARCHAR(32) NOT NULL,
  run_id VARCHAR(64) NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  level SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT arcade_scores_user_id_users_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT arcade_scores_game_check
    CHECK (game IN ('snake', 'tetris', 'brick_ball', 'xensia')),
  CONSTRAINT arcade_scores_score_check CHECK (score >= 0),
  CONSTRAINT arcade_scores_duration_check CHECK (duration_ms >= 0)
)`,
  `CREATE INDEX IF NOT EXISTS arcade_scores_game_score_idx
  ON public.arcade_scores (game, score DESC, created_at ASC)`,
  `CREATE INDEX IF NOT EXISTS arcade_scores_user_game_score_idx
  ON public.arcade_scores (user_id, game, score DESC)`,
];

export interface ArcadeScoresSchemaClient {
  query(text: string, values?: unknown[]): Promise<unknown>;
  release(error?: Error | boolean): void;
}

export interface ArcadeScoresSchemaPool {
  connect(): Promise<ArcadeScoresSchemaClient>;
}

const ensured = new WeakMap<object, Promise<void>>();

export function ensureArcadeScoresSchema(
  pool: ArcadeScoresSchemaPool,
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

async function runEnsure(pool: ArcadeScoresSchemaPool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [
      ARCADE_SCORES_SCHEMA_LOCK_KEY,
    ]);
    for (const statement of ARCADE_SCORES_SCHEMA_STATEMENTS) {
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

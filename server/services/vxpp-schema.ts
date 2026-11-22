/**
 * Idempotent schema upgrades for vxpp personal profile media, bio fields,
 * and persistent PostgreSQL-backed social post images.
 */
import type { Pool, PoolClient } from "pg";

export const VXPP_SCHEMA_UPGRADES: readonly string[] = [
  `ALTER TABLE social_users ADD COLUMN IF NOT EXISTS avatar_data BYTEA`,
  `ALTER TABLE social_users ADD COLUMN IF NOT EXISTS avatar_mime TEXT`,
  `ALTER TABLE social_users ADD COLUMN IF NOT EXISTS cover_data BYTEA`,
  `ALTER TABLE social_users ADD COLUMN IF NOT EXISTS cover_mime TEXT`,
  `ALTER TABLE social_users ADD COLUMN IF NOT EXISTS headline TEXT`,
  `ALTER TABLE social_users ADD COLUMN IF NOT EXISTS interests TEXT[]`,
  `CREATE TABLE IF NOT EXISTS social_post_media (
    id SERIAL PRIMARY KEY,
    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL,
    data BYTEA NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT social_post_media_size_check CHECK (size_bytes > 0 AND size_bytes <= 5242880)
  )`,
  `CREATE INDEX IF NOT EXISTS social_post_media_owner_idx ON social_post_media (owner_user_id, created_at DESC)`,
];

let ensured = false;

export async function ensureVxppSchema(queryable: {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
}): Promise<void> {
  if (ensured) return;
  for (const statement of VXPP_SCHEMA_UPGRADES) {
    await queryable.query(statement);
  }
  ensured = true;
}

export function resetVxppSchemaCacheForTests(): void {
  ensured = false;
}

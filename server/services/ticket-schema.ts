export const TICKET_SCHEMA_UPGRADES = [
  `UPDATE tickets SET status='in-progress' WHERE status='in_progress'`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pending_reason VARCHAR`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pending_since TIMESTAMPTZ`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS abandonment_proposed_at TIMESTAMPTZ`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES inbox_conversations(id)`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS duplicate_of INTEGER REFERENCES tickets(id)`,
  `ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS internal BOOLEAN NOT NULL DEFAULT false`,
  `CREATE UNIQUE INDEX IF NOT EXISTS tickets_conversation_unique ON tickets (conversation_id) WHERE conversation_id IS NOT NULL`,
  `UPDATE tickets SET sla_due_at = created_at + COALESCE(sla_target_hours, 24) * INTERVAL '1 hour' WHERE sla_due_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS ticket_events (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    actor_id INTEGER REFERENCES users(id),
    kind VARCHAR NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    internal BOOLEAN NOT NULL DEFAULT false,
    dedupe_key VARCHAR UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS ticket_events_ticket_idx ON ticket_events(ticket_id, id)`,
  `CREATE TABLE IF NOT EXISTS ticket_alerts (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    kind VARCHAR NOT NULL,
    cycle_key VARCHAR NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticket_id, kind, cycle_key)
  )`,
  `CREATE TABLE IF NOT EXISTS implementation_tracking (
    lot_id VARCHAR PRIMARY KEY,
    status VARCHAR NOT NULL DEFAULT 'todo',
    evidence TEXT NOT NULL DEFAULT '',
    blocker TEXT NOT NULL DEFAULT '',
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];

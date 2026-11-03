/**
 * Durable outbox for Zapier deliveries. Every function takes its database as
 * a parameter so the SQL can be exercised against a throwaway Postgres without
 * importing server/db.ts (which reads DATABASE_URL at import time).
 */
import type { AutomationEnvelope } from "../../shared/automation-events";

export interface AutomationDb {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: any[]; rowCount?: number | null }>;
}

export type OutboxStatus = "pending" | "sent" | "acknowledged" | "dead";

export interface ClaimedOutboxRow {
  id: number;
  eventId: string;
  attempts: number;
  payload: Record<string, unknown>;
}

export interface EnqueueInput {
  category: string;
  envelope: AutomationEnvelope;
  body: Record<string, unknown>;
}

export type ActionResult = "claimed" | "duplicate" | "unknown_event";

export interface AutomationHealthCounts {
  pending: number;
  retrying: number;
  sent: number;
  acknowledged: number;
  dead: number;
  ackOverdue: number;
  oldestPendingAgeSeconds: number | null;
}

/** Returns false when the event id was already queued. */
export async function enqueueOutboxEvent(
  db: AutomationDb,
  input: EnqueueInput,
): Promise<boolean> {
  const { category, envelope, body } = input;
  const result = await db.query(
    `INSERT INTO public.automation_outbox
       (event_id, schema_version, category, event_type, topic, market_id,
        country_code, timezone, priority, entity_type, entity_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING id`,
    [
      envelope.eventId,
      envelope.schemaVersion,
      category,
      envelope.eventType,
      envelope.topic,
      envelope.marketId,
      envelope.countryCode,
      envelope.timezone,
      envelope.priority,
      envelope.entityType,
      envelope.entityId,
      JSON.stringify(body),
    ],
  );
  return result.rows.length > 0;
}

/**
 * Leases due rows to this worker. Attempts are counted at claim time so a
 * worker that crashes mid-delivery still moves the row toward dead-lettering
 * once its lease expires. No transaction is held across the HTTP call.
 */
export async function claimDueOutboxRows(
  db: AutomationDb,
  options: { limit: number; leaseMs: number },
): Promise<ClaimedOutboxRow[]> {
  // MATERIALIZED forces the locking subquery to run once; as a plain IN (...)
  // the planner may re-run it per row and claim more than LIMIT rows.
  const result = await db.query(
    `WITH due AS MATERIALIZED (
       SELECT id FROM public.automation_outbox
        WHERE status = 'pending'
          AND next_attempt_at <= NOW()
          AND (lease_until IS NULL OR lease_until < NOW())
        ORDER BY next_attempt_at, id
        LIMIT $1
        FOR UPDATE SKIP LOCKED
     )
     UPDATE public.automation_outbox AS o
        SET attempts = o.attempts + 1,
            lease_until = NOW() + ($2::int * INTERVAL '1 millisecond')
       FROM due
      WHERE o.id = due.id
      RETURNING o.id, o.event_id, o.attempts, o.payload`,
    [options.limit, options.leaseMs],
  );
  return result.rows
    .map((row) => ({
      id: Number(row.id),
      eventId: String(row.event_id),
      attempts: Number(row.attempts),
      payload: row.payload as Record<string, unknown>,
    }))
    .sort((a, b) => a.id - b.id);
}

/** Identifies one lease: claiming a row increments `attempts`, so the pair is unique per claim. */
export type OutboxClaim = Pick<ClaimedOutboxRow, "id" | "attempts">;

/*
 * The result updates below are fenced by the claimed attempt count. A worker
 * that stalled past its lease must not overwrite a row another worker has
 * since re-claimed, so each returns false when its claim is no longer current.
 */

export async function markOutboxSent(
  db: AutomationDb,
  claim: OutboxClaim,
  httpStatus: number,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE public.automation_outbox
        SET status = 'sent', sent_at = NOW(), lease_until = NULL,
            last_http_status = $3, last_error = NULL
      WHERE id = $1 AND attempts = $2 AND status = 'pending'
      RETURNING id`,
    [claim.id, claim.attempts, httpStatus],
  );
  return result.rows.length > 0;
}

export async function markOutboxRetry(
  db: AutomationDb,
  claim: OutboxClaim,
  options: { delayMs: number; error: string; httpStatus: number | null },
): Promise<boolean> {
  const result = await db.query(
    `UPDATE public.automation_outbox
        SET next_attempt_at = NOW() + ($3::int * INTERVAL '1 millisecond'),
            lease_until = NULL, last_error = $4, last_http_status = $5
      WHERE id = $1 AND attempts = $2 AND status = 'pending'
      RETURNING id`,
    [claim.id, claim.attempts, Math.round(options.delayMs), options.error, options.httpStatus],
  );
  return result.rows.length > 0;
}

export async function markOutboxDead(
  db: AutomationDb,
  claim: OutboxClaim,
  options: { error: string; httpStatus: number | null },
): Promise<boolean> {
  const result = await db.query(
    `UPDATE public.automation_outbox
        SET status = 'dead', dead_at = NOW(), lease_until = NULL,
            last_error = $3, last_http_status = $4
      WHERE id = $1 AND attempts = $2 AND status = 'pending'
      RETURNING id`,
    [claim.id, claim.attempts, options.error, options.httpStatus],
  );
  return result.rows.length > 0;
}

/**
 * The Zap proves end-to-end delivery by calling back, which also covers the
 * case where Zapier ran but our HTTP response was lost (row still pending).
 */
export async function acknowledgeOutboxEvent(
  db: AutomationDb,
  eventId: string,
): Promise<{ found: boolean; alreadyAcknowledged: boolean }> {
  const updated = await db.query(
    `UPDATE public.automation_outbox
        SET status = 'acknowledged',
            acknowledged_at = COALESCE(acknowledged_at, NOW()),
            lease_until = NULL
      WHERE event_id = $1 AND status <> 'acknowledged'
      RETURNING id`,
    [eventId],
  );
  if (updated.rows.length > 0) return { found: true, alreadyAcknowledged: false };

  const existing = await db.query(
    "SELECT 1 FROM public.automation_outbox WHERE event_id = $1",
    [eventId],
  );
  return { found: existing.rows.length > 0, alreadyAcknowledged: existing.rows.length > 0 };
}

/**
 * First caller wins; repeats report "duplicate" so a replayed Zap run can skip
 * an irreversible step such as sending an email.
 */
export async function recordAutomationAction(
  db: AutomationDb,
  input: {
    eventId: string;
    actionKey: string;
    actor: string;
    detail: Record<string, unknown>;
  },
): Promise<ActionResult> {
  const inserted = await db.query(
    `INSERT INTO public.automation_actions (event_id, action_key, actor, detail)
     SELECT event_id, $2, $3, $4::jsonb
       FROM public.automation_outbox
      WHERE event_id = $1
     ON CONFLICT (event_id, action_key) DO NOTHING
     RETURNING id`,
    [input.eventId, input.actionKey, input.actor, JSON.stringify(input.detail)],
  );
  if (inserted.rows.length > 0) return "claimed";

  const existing = await db.query(
    "SELECT 1 FROM public.automation_outbox WHERE event_id = $1",
    [input.eventId],
  );
  return existing.rows.length > 0 ? "duplicate" : "unknown_event";
}

export async function getAutomationHealthCounts(
  db: AutomationDb,
  options: { ackOverdueSeconds: number; windowDays: number },
): Promise<AutomationHealthCounts> {
  const result = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'pending' AND attempts > 0)::int AS retrying,
       COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
       COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged,
       COUNT(*) FILTER (WHERE status = 'dead')::int AS dead,
       COUNT(*) FILTER (
         WHERE status = 'sent'
           AND sent_at < NOW() - ($1::int * INTERVAL '1 second')
       )::int AS ack_overdue,
       EXTRACT(EPOCH FROM (
         NOW() - MIN(created_at) FILTER (WHERE status = 'pending')
       ))::int AS oldest_pending_age_seconds
     FROM public.automation_outbox
     WHERE created_at > NOW() - ($2::int * INTERVAL '1 day')`,
    [options.ackOverdueSeconds, options.windowDays],
  );
  const row = result.rows[0] ?? {};
  return {
    pending: Number(row.pending ?? 0),
    retrying: Number(row.retrying ?? 0),
    sent: Number(row.sent ?? 0),
    acknowledged: Number(row.acknowledged ?? 0),
    dead: Number(row.dead ?? 0),
    ackOverdue: Number(row.ack_overdue ?? 0),
    oldestPendingAgeSeconds:
      row.oldest_pending_age_seconds === null ||
      row.oldest_pending_age_seconds === undefined
        ? null
        : Number(row.oldest_pending_age_seconds),
  };
}

/** Drops personal data from finalized rows; counters and ids stay for reporting. */
export async function scrubFinalizedPayloads(
  db: AutomationDb,
  options: { retentionDays: number },
): Promise<number> {
  const result = await db.query(
    `UPDATE public.automation_outbox
        SET payload = '{"scrubbed": true}'::jsonb, payload_scrubbed_at = NOW()
      WHERE payload_scrubbed_at IS NULL
        AND status IN ('sent', 'acknowledged', 'dead')
        AND COALESCE(acknowledged_at, dead_at, sent_at)
              < NOW() - ($1::int * INTERVAL '1 day')
      RETURNING id`,
    [options.retentionDays],
  );
  return result.rows.length;
}

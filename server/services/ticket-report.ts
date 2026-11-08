import type { PoolClient } from "pg";
import {
  slaComplianceRate, summarizeActiveSla, TICKET_PRIORITIES, TICKET_TYPES,
  type SlaBreakdown, type SlaReport, type SlaTicketRow,
} from "@shared/ticket-policy";

export interface TicketScope { sql: string; values: unknown[] }

interface GroupRow {
  scope: "all" | "priority" | "type";
  key: string | null;
  created: number;
  resolved: number;
  met: number;
  breached: number;
  avg_hours: number | null;
  median_hours: number | null;
  minutes: number;
}

const round2 = (value: number | null) => (value === null ? null : Math.round(value * 100) / 100);
function breakdown(key: string, row?: GroupRow): SlaBreakdown {
  const met = row?.met ?? 0;
  const breached = row?.breached ?? 0;
  return {
    key,
    created: row?.created ?? 0,
    resolved: row?.resolved ?? 0,
    met,
    breached,
    complianceRate: slaComplianceRate(met, breached),
    avgResolutionHours: round2(row?.avg_hours ?? null),
    medianResolutionHours: round2(row?.median_hours ?? null),
    timeSpentMinutes: row?.minutes ?? 0,
  };
}
// Known keys come first in a fixed order; anything unexpected (such as a missing priority) follows.
function ordered(rows: GroupRow[], known: readonly string[]): SlaBreakdown[] {
  const byKey = new Map(rows.map((row) => [row.key ?? "unknown", row]));
  const extra = [...byKey.keys()].filter((key) => !known.includes(key)).sort();
  return [...known, ...extra].map((key) => breakdown(key, byKey.get(key)));
}

/**
 * SLA performance for tickets the caller may see.
 * - Resolved cohort: resolved inside the window, excluding rejected changes (they close without work).
 * - A ticket met its SLA when it was resolved on or before sla_due_at, which already includes paused time.
 * - The window is computed in SQL: created_at and resolved_at are timestamps without a zone, so passing a
 *   JavaScript Date would silently ignore its offset.
 */
export async function buildSlaReport(
  db: Pick<PoolClient, "query">, filter: TicketScope, days: number, now = new Date(),
): Promise<SlaReport> {
  const since = `(NOW() - ($${filter.values.length + 1}::int * INTERVAL '1 day'))`;
  const hoursToResolve = "EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600";
  const [grouped, active] = await Promise.all([
    db.query<GroupRow>(
      `WITH base AS (
         SELECT priority, ticket_type, created_at, resolved_at, sla_due_at, time_spent_minutes,
           (created_at >= ${since}) AS is_created,
           (resolved_at >= ${since} AND status IN ('resolved','closed')
             AND NOT (ticket_type = 'change' AND approval_status = 'rejected')) AS is_resolved
         FROM tickets
         WHERE ${filter.sql} AND (created_at >= ${since} OR resolved_at >= ${since})
       )
       SELECT
         CASE WHEN GROUPING(priority) = 0 THEN 'priority' WHEN GROUPING(ticket_type) = 0 THEN 'type' ELSE 'all' END AS scope,
         COALESCE(priority, ticket_type) AS key,
         COUNT(*) FILTER (WHERE is_created)::int AS created,
         COUNT(*) FILTER (WHERE is_resolved)::int AS resolved,
         COUNT(*) FILTER (WHERE is_resolved AND sla_due_at IS NOT NULL AND resolved_at <= sla_due_at)::int AS met,
         COUNT(*) FILTER (WHERE is_resolved AND sla_due_at IS NOT NULL AND resolved_at > sla_due_at)::int AS breached,
         (AVG(${hoursToResolve}) FILTER (WHERE is_resolved))::float8 AS avg_hours,
         (percentile_cont(0.5) WITHIN GROUP (ORDER BY (${hoursToResolve})::float8) FILTER (WHERE is_resolved))::float8 AS median_hours,
         COALESCE(SUM(time_spent_minutes) FILTER (WHERE is_resolved), 0)::int AS minutes
       FROM base
       GROUP BY GROUPING SETS ((), (priority), (ticket_type))`,
      [...filter.values, days],
    ),
    db.query<SlaTicketRow>(
      `SELECT id, title, priority, status, ticket_type, pending_reason, sla_due_at, sla_target_hours
       FROM tickets WHERE ${filter.sql} AND status IN ('open','in-progress','pending')`,
      filter.values,
    ),
  ]);
  const rows = grouped.rows;
  return {
    ...breakdown("all", rows.find((row) => row.scope === "all")),
    windowDays: days,
    generatedAt: now.toISOString(),
    ...summarizeActiveSla(active.rows, now),
    byPriority: ordered(rows.filter((row) => row.scope === "priority"), [...TICKET_PRIORITIES].reverse()),
    byType: ordered(rows.filter((row) => row.scope === "type"), TICKET_TYPES),
  };
}

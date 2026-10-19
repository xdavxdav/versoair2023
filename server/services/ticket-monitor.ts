import cron from "node-cron";
import { pool } from "../db";
import { TERMINAL_STATUSES } from "@shared/ticket-policy";

export interface MonitoredTicket {
  id: number;
  status: string;
  pending_reason: string | null;
  pending_since: Date | string | null;
  follow_up_at: Date | string | null;
  sla_due_at: Date | string | null;
}
export function dueTicketAlerts(ticket: MonitoredTicket, now = new Date()) {
  if (TERMINAL_STATUSES.includes(ticket.status)) return [];
  const alerts: { kind: string; cycle: string; message: string; public: boolean }[] = [];
  if (ticket.sla_due_at && new Date(ticket.sla_due_at) <= now) {
    alerts.push({
      kind: "sla-breach", cycle: new Date(ticket.sla_due_at).toISOString(),
      message: "The support target has been exceeded. Manager review is required.", public: false,
    });
  }
  if (ticket.status !== "pending" || !ticket.pending_since) return alerts;
  const cycle = new Date(ticket.pending_since).toISOString();
  if (ticket.follow_up_at && new Date(ticket.follow_up_at) <= now) {
    alerts.push({ kind: "follow-up", cycle, message: "The scheduled follow-up is due.", public: false });
  }
  if (ticket.pending_reason === "customer") {
    const days = (now.getTime() - new Date(ticket.pending_since).getTime()) / 86400000;
    for (const day of [3, 7]) {
      if (days >= day) alerts.push({
        kind: `customer-reminder-${day}`, cycle,
        message: `We are waiting for your response to continue this ticket (day ${day}). Please reply in the ticket.`,
        public: true,
      });
    }
    if (days >= 14) alerts.push({
      kind: "abandonment-proposed", cycle,
      message: "Customer response outstanding after two reminders and 14 days. A manager must decide whether to abandon; no automatic closure.",
      public: false,
    });
  }
  return alerts;
}

export async function runTicketMonitor() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_xact_lock(74319018) AS acquired",
    );
    if (!lock.rows[0].acquired) {
      await client.query("COMMIT");
      return;
    }
    const { rows } = await client.query<MonitoredTicket>(
      `SELECT id,status,pending_reason,pending_since,follow_up_at,sla_due_at FROM tickets
       WHERE status IN ('open','in-progress','pending') AND
         (sla_due_at<=NOW() OR follow_up_at<=NOW() OR pending_since<=NOW()-INTERVAL '3 days')
       ORDER BY id FOR UPDATE SKIP LOCKED`,
    );
    for (const ticket of rows) {
      for (const alert of dueTicketAlerts(ticket)) {
        const inserted = await client.query<{ id: number }>(
          `INSERT INTO ticket_alerts(ticket_id,kind,cycle_key,message) VALUES ($1,$2,$3,$4)
           ON CONFLICT (ticket_id,kind,cycle_key) DO NOTHING RETURNING id`,
          [ticket.id, alert.kind, alert.cycle, alert.message],
        );
        if (!inserted.rows.length) continue;
        if (alert.kind === "sla-breach") {
          await client.query("UPDATE tickets SET sla_breached=true WHERE id=$1", [ticket.id]);
        }
        if (alert.kind === "abandonment-proposed") {
          await client.query("UPDATE tickets SET abandonment_proposed_at=NOW() WHERE id=$1", [ticket.id]);
        }
        if (alert.public) {
          await client.query(
            `INSERT INTO ticket_comments(ticket_id,author_name,body,internal) VALUES ($1,'Support',$2,false)`,
            [ticket.id, alert.message],
          );
        }
        await client.query(
          `INSERT INTO ticket_events(ticket_id,kind,details,internal,dedupe_key)
           VALUES ($1,$2,$3,$4,$5)`,
          [ticket.id, alert.kind, JSON.stringify({ message: alert.message }), !alert.public, `alert:${inserted.rows[0].id}`],
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
export function startTicketMonitor() {
  const run = () => {
    void runTicketMonitor().catch((error) => console.error("[TICKETS] Follow-up monitor failed; durable work will retry next minute:", error));
  };
  run();
  return cron.schedule("* * * * *", run);
}

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { PoolClient } from "pg";
import { pool } from "../db";
import { requireAuth, isOwner } from "../middleware/auth";
import {
  assignTicketSchema, canReadTicket, canWorkTicket, commentSchema, createTicketSchema,
  isTicketManager, isTicketStaff, SLA_HOURS, TERMINAL_STATUSES, TICKET_STATUSES,
  transitionError, updateTicketSchema, type SupportTicket, type TicketActor,
} from "@shared/ticket-policy";

const router = Router();
router.use(requireAuth());
const actorFor = (req: Request): TicketActor => ({
  id: Number(req.user!.userId), role: req.user!.role, owner: isOwner(req.user),
});
const idSchema = z.coerce.number().int().positive().max(2147483647);
class TicketError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const route = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
function parse<Output, Def extends z.ZodTypeDef, Input>(schema: z.ZodType<Output, Def, Input>, value: unknown): Output {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new TicketError(400, parsed.error.issues.map((issue) => issue.message).join("; "));
  return parsed.data;
}
function scope(actor: TicketActor, firstParameter = 1) {
  if (isTicketManager(actor)) return { sql: "TRUE", values: [] };
  if (isTicketStaff(actor)) return {
    sql: `(assignee_id IS NULL OR assignee_id = $${firstParameter})`, values: [actor.id],
  };
  return { sql: `reporter_id = $${firstParameter}`, values: [actor.id] };
}
async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
async function readTicket(client: Pick<PoolClient, "query">, id: number, actor: TicketActor, lock = false) {
  const { rows } = await client.query<SupportTicket>(
    `SELECT * FROM tickets WHERE id = $1${lock ? " FOR UPDATE" : ""}`, [id],
  );
  if (!rows[0] || !canReadTicket(actor, rows[0])) throw new TicketError(404, "Ticket not found");
  return rows[0];
}
async function event(client: PoolClient, id: number, actor: TicketActor, kind: string, details: object, internal = false) {
  await client.query(
    "INSERT INTO ticket_events(ticket_id, actor_id, kind, details, internal) VALUES ($1,$2,$3,$4,$5)",
    [id, actor.id, kind, JSON.stringify(details), internal],
  );
}
async function update(client: PoolClient, id: number, actor: TicketActor, input: z.infer<typeof updateTicketSchema>) {
  const before = await readTicket(client, id, actor, true);
  if (input.status) {
    const denial = transitionError(actor, before, input.status);
    if (denial) throw new TicketError(403, denial);
    if (input.status === "pending" && new Date(input.followUpAt!).getTime() <= Date.now()) {
      throw new TicketError(400, "Follow-up must be in the future");
    }
    if (input.status === "in-progress" && !before.assignee_id) {
      throw new TicketError(400, "Assign or claim the ticket first");
    }
    if (input.status === "abandoned" && !before.abandonment_proposed_at) {
      throw new TicketError(409, "Abandonment requires the completed customer reminder cycle");
    }
  }
  if (input.priority && !isTicketManager(actor)) throw new TicketError(403, "Only a manager can change priority");
  if (input.duplicateOf) {
    if (input.status !== "voided" || input.duplicateOf === id) throw new TicketError(400, "Invalid duplicate reference");
    await readTicket(client, input.duplicateOf, actor);
  }
  const nextStatus = input.status || before.status;
  const priority = input.priority || before.priority;
  const now = new Date();
  const enteringPending = input.status === "pending";
  const leavingPending = Boolean(input.status && input.status !== "pending");
  const reopening = (input.status === "in-progress" || input.status === "open") && TERMINAL_STATUSES.includes(before.status);
  const dueAt = reopening ? new Date(now.getTime() + SLA_HOURS[priority] * 3600000)
    : input.priority ? new Date(
      (before.sla_due_at ? new Date(before.sla_due_at).getTime() - SLA_HOURS[before.priority] * 3600000 : new Date(before.created_at).getTime())
      + SLA_HOURS[priority] * 3600000)
    : before.sla_due_at;
  const { rows } = await client.query<SupportTicket>(
    `UPDATE tickets SET status=$2::text, priority=$3, sla_target_hours=$4, sla_due_at=$5,
      pending_reason=$6, pending_since=$7, follow_up_at=$8,
      abandonment_proposed_at=$9,
      resolved_at=CASE WHEN $2='resolved' THEN COALESCE(resolved_at,NOW())
        WHEN $2='closed' THEN resolved_at ELSE NULL END,
      duplicate_of=COALESCE($10,duplicate_of),
      sla_breached=CASE WHEN $11 THEN false ELSE sla_breached END, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [id, nextStatus, priority, SLA_HOURS[priority], dueAt,
      enteringPending ? input.pendingReason : leavingPending ? null : before.pending_reason,
      enteringPending ? now : leavingPending ? null : before.pending_since,
      enteringPending ? input.followUpAt : leavingPending ? null : before.follow_up_at,
      input.status ? null : before.abandonment_proposed_at, input.duplicateOf || null, reopening],
  );
  // Public history never contains staff-only reasons or pending metadata.
  await event(client, id, actor, "updated", {
    from: before.status, to: nextStatus, previousPriority: before.priority, priority,
  });
  await event(client, id, actor, "update-details", { ...input }, true);
  return rows[0];
}

router.get("/", route(async (req, res) => {
  const filter = scope(actorFor(req));
  const { rows } = await pool.query<SupportTicket>(
    `SELECT * FROM tickets WHERE ${filter.sql} ORDER BY updated_at DESC, id DESC`, filter.values,
  );
  res.json(rows.map((ticket) => publicTicket(ticket, actorFor(req))));
}));

function publicTicket(ticket: SupportTicket, actor: TicketActor) {
  if (isTicketStaff(actor)) return ticket;
  const { pending_reason: _pending, abandonment_proposed_at: _abandonment, ...publicFields } = ticket;
  return publicFields;
}

router.get("/staff", route(async (req, res) => {
  const actor = actorFor(req);
  if (!isTicketManager(actor)) throw new TicketError(403, "Manager access required");
  const { rows } = await pool.query(
    `SELECT id, username, role FROM users WHERE role IN ('admin','moderator','tsr')
     OR (role='superuser' AND lower(email)=lower($1)) ORDER BY username`,
    [process.env.SUPERADMIN_EMAIL?.trim() || ""],
  );
  res.json(rows);
}));

router.get("/stats/summary", route(async (req, res) => {
  const filter = scope(actorFor(req));
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER(WHERE status='open')::int AS open,
      COUNT(*) FILTER(WHERE status='in-progress')::int AS "inProgress",
      COUNT(*) FILTER(WHERE status='pending')::int AS pending,
      COUNT(*) FILTER(WHERE status='resolved')::int AS resolved,
      COUNT(*) FILTER(WHERE status='closed')::int AS closed,
      COUNT(*) FILTER(WHERE status='withdrawn')::int AS withdrawn,
      COUNT(*) FILTER(WHERE status='abandoned')::int AS abandoned,
      COUNT(*) FILTER(WHERE status='voided')::int AS voided,
      COUNT(*) FILTER(WHERE sla_breached)::int AS "slaBreaches",
      AVG(EXTRACT(EPOCH FROM (resolved_at-created_at))/3600)
        FILTER(WHERE status IN ('resolved','closed')) AS "avgResolutionTime"
     FROM tickets WHERE ${filter.sql}`, filter.values,
  );
  res.json(rows[0]);
}));

router.get("/alerts", route(async (req, res) => {
  const actor = actorFor(req);
  if (!isTicketStaff(actor)) throw new TicketError(403, "Staff access required");
  const filter = scope(actor);
  const { rows } = await pool.query(
    `SELECT a.* FROM ticket_alerts a JOIN tickets t ON t.id=a.ticket_id
     WHERE ${filter.sql} ORDER BY a.id DESC LIMIT 200`, filter.values,
  );
  res.json(rows);
}));

for (const path of ["/sla/breaches", "/status/:status", "/priority/critical"]) {
  router.get(path, route(async (req, res) => {
    const actor = actorFor(req);
    if (!isTicketStaff(actor)) throw new TicketError(403, "Staff access required");
    const filter = scope(actor);
    const condition = path === "/sla/breaches" ? "sla_breached=true"
      : path === "/priority/critical" ? "priority IN ('high','critical')"
      : `status = $${filter.values.length + 1}`;
    const values = [...filter.values];
    const { rows } = await pool.query(
      `SELECT * FROM tickets WHERE ${filter.sql} AND ${condition} ORDER BY created_at DESC`,
      path === "/status/:status" ? [...values, parse(z.enum(TICKET_STATUSES), req.params.status)] : values,
    );
    res.json(rows);
  }));
}

router.post("/", route(async (req, res) => {
  const input = parse(createTicketSchema, req.body);
  const actor = actorFor(req);
  const ticket = await transaction(async (client) => {
    const { rows: users } = await client.query<{ subscription_tier: string }>(
      "SELECT subscription_tier FROM users WHERE id=$1", [actor.id],
    );
    const priority = !isTicketStaff(actor) && users[0]?.subscription_tier === "enterprise" &&
      ["low", "medium"].includes(input.priority) ? "high" : input.priority;
    const { rows } = await client.query<SupportTicket>(
      `INSERT INTO tickets(title,description,priority,category,reporter,reporter_id,requester_email,
        sla_target_hours,sla_due_at) VALUES ($1,$2,$3,$4,$5::text,$6,$5::text,$7::integer,NOW()+$7::integer*INTERVAL '1 hour') RETURNING *`,
      [input.title, input.description, priority, input.category, req.user!.email, actor.id, SLA_HOURS[priority]],
    );
    await event(client, rows[0].id, actor, "created", { source: "portal" });
    return rows[0];
  });
  res.status(201).json(publicTicket(ticket, actor));
}));

router.post("/handoff", route(async (req, res) => {
  const input = parse(z.union([
    z.object({ conversationId: idSchema, confirmed: z.literal(true) }).strict(),
    z.object({ message: z.string().trim().min(1).max(5000), confirmed: z.literal(true) }).strict(),
  ]), req.body);
  const actor = actorFor(req);
  const ticket = await transaction(async (client) => {
    let conversationId: number;
    if ("message" in input) {
      await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [actor.id]);
      const { rows } = await client.query<{ id: number }>(
        "SELECT id FROM inbox_conversations WHERE user_id=$1 AND type='support' ORDER BY id LIMIT 1",
        [actor.id],
      );
      if (rows[0]) conversationId = rows[0].id;
      else {
        const created = await client.query<{ id: number }>(
          `INSERT INTO inbox_conversations(user_id,type,participant_id,participant_name)
           VALUES ($1,'support','support','VersoAI Support') RETURNING id`, [actor.id],
        );
        conversationId = created.rows[0].id;
      }
    } else conversationId = input.conversationId;
    const { rows: conversations } = await client.query<{ id: number }>(
      "SELECT id FROM inbox_conversations WHERE id=$1 AND user_id=$2 AND type='support' FOR UPDATE",
      [conversationId, actor.id],
    );
    if (!conversations.length) throw new TicketError(404, "Support conversation not found");
    const { rows: existing } = await client.query<SupportTicket>(
      "SELECT * FROM tickets WHERE conversation_id=$1", [conversationId],
    );
    if (existing[0]) return existing[0];
    if ("message" in input) {
      await client.query(
        "INSERT INTO inbox_messages(conversation_id,sender_id,sender_name,content) VALUES ($1,$2,$3,$4)",
        [conversationId, String(actor.id), req.user!.email, input.message],
      );
    }
    const { rows: messages } = await client.query<{ content: string }>(
      `SELECT content FROM inbox_messages WHERE conversation_id=$1 AND sender_id=$2 ORDER BY id DESC LIMIT 1`,
      [conversationId, String(actor.id)],
    );
    if (!messages[0]) throw new TicketError(400, "Send a support message before requesting a handoff");
    const { rows } = await client.query<SupportTicket>(
      `INSERT INTO tickets(title,description,reporter_id,reporter,requester_email,conversation_id,source,sla_due_at)
       VALUES ($1,$2,$3,$4::text,$4::text,$5,'versoai',NOW()+INTERVAL '24 hours') RETURNING *`,
      [`VersoAI: ${messages[0].content.slice(0, 170)}`, messages[0].content.slice(0, 5000),
        actor.id, req.user!.email, conversationId],
    );
    await event(client, rows[0].id, actor, "created", { source: "versoai" });
    await client.query(
      `INSERT INTO inbox_messages(conversation_id,sender_id,sender_name,content)
       VALUES ($1,'support','VersoAI Support',$2)`,
      [conversationId, `Human support requested. Ticket #${rows[0].id}. Follow its progress at /tickets.`],
    );
    return rows[0];
  });
  res.json(publicTicket(ticket, actor));
}));

router.post("/batch/update", route(async (req, res) => {
  const input = parse(z.object({
    ids: z.array(idSchema).min(1).max(200),
    updates: updateTicketSchema,
  }).strict(), req.body);
  const actor = actorFor(req);
  if (!isTicketManager(actor)) throw new TicketError(403, "Manager access required");
  const ids = [...new Set(input.ids)].sort((a, b) => a - b);
  await transaction(async (client) => {
    for (const id of ids) await update(client, id, actor, input.updates);
  });
  res.json({ success: true, updated: ids.length });
}));

router.get("/:id", route(async (req, res) => {
  const actor = actorFor(req);
  const ticket = await readTicket(pool, parse(idSchema, req.params.id), actor);
  res.json(publicTicket(ticket, actor));
}));
router.put("/:id", route(async (req, res) => {
  const actor = actorFor(req);
  const input = parse(updateTicketSchema, req.body);
  const ticket = await transaction((client) => update(client, parse(idSchema, req.params.id), actor, input));
  res.json(publicTicket(ticket, actor));
}));
router.delete("/:id", route(async () => {
  throw new TicketError(405, "Tickets are retained for audit. Use a reasoned voided transition instead.");
}));
router.put("/:id/assign", route(async (req, res) => {
  const input = parse(assignTicketSchema, req.body);
  const actor = actorFor(req);
  const ticket = await transaction(async (client) => {
    const id = parse(idSchema, req.params.id);
    const before = await readTicket(client, id, actor, true);
    if (!isTicketManager(actor) && !(isTicketStaff(actor) && before.assignee_id === null && input.assigneeId === actor.id)) {
      throw new TicketError(403, "Only managers can reassign tickets; staff can claim an unassigned ticket");
    }
    if (TERMINAL_STATUSES.includes(before.status)) throw new TicketError(409, "Reopen the ticket before reassigning");
    if (input.assigneeId !== null) {
      const { rows } = await client.query<{ role: string; email: string }>("SELECT role,email FROM users WHERE id=$1", [input.assigneeId]);
      const target = rows[0];
      if (!target || !isTicketStaff({ id: input.assigneeId, role: target.role, owner: isOwner(target) })) {
        throw new TicketError(400, "Assignee must be an active support staff account");
      }
    }
    const { rows } = await client.query<SupportTicket>(
      "UPDATE tickets SET assignee_id=$2,team=$3,updated_at=NOW() WHERE id=$1 RETURNING *",
      [id, input.assigneeId, input.team ?? before.team],
    );
    await event(client, id, actor, "assigned", { from: before.assignee_id, to: input.assigneeId, reason: input.reason }, true);
    return rows[0];
  });
  res.json(ticket);
}));
router.post("/:id/escalate", route(async (req, res) => {
  const input = parse(z.object({ reason: z.string().trim().min(1).max(2000) }).strict(), req.body);
  const actor = actorFor(req);
  await transaction(async (client) => {
    const id = parse(idSchema, req.params.id);
    const ticket = await readTicket(client, id, actor, true);
    if (!canWorkTicket(actor, ticket)) throw new TicketError(403, "Assigned staff access required");
    await client.query(
      "INSERT INTO ticket_alerts(ticket_id,kind,cycle_key,message) VALUES ($1,'staff-escalation',$2,$3)",
      [id, crypto.randomUUID(), input.reason],
    );
    await event(client, id, actor, "escalated", input, true);
  });
  res.json({ success: true });
}));
router.get("/:id/comments", route(async (req, res) => {
  const actor = actorFor(req);
  const id = parse(idSchema, req.params.id);
  await readTicket(pool, id, actor);
  const { rows } = await pool.query(
    "SELECT * FROM ticket_comments WHERE ticket_id=$1 AND (NOT internal OR $2) ORDER BY id",
    [id, isTicketStaff(actor)],
  );
  res.json(rows);
}));
router.post("/:id/comments", route(async (req, res) => {
  const actor = actorFor(req);
  const input = parse(commentSchema, req.body);
  const result = await transaction(async (client) => {
    const id = parse(idSchema, req.params.id);
    const ticket = await readTicket(client, id, actor, true);
    if (isTicketStaff(actor) && !canWorkTicket(actor, ticket)) throw new TicketError(403, "Claim the ticket first");
    if (input.internal && !isTicketStaff(actor)) throw new TicketError(403, "Internal notes are staff only");
    const { rows } = await client.query(
      `INSERT INTO ticket_comments(ticket_id,author_id,author_name,body,internal)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, actor.id, req.user!.email, input.body, input.internal],
    );
    // A requester response ends the customer-wait cycle, preventing stale reminders.
    if (!input.internal && ticket.reporter_id === actor.id && ticket.status === "pending" && ticket.pending_reason === "customer") {
      await client.query(
        `UPDATE tickets SET status=CASE WHEN assignee_id IS NULL THEN 'open' ELSE 'in-progress' END,
          pending_reason=NULL,pending_since=NULL,follow_up_at=NULL,abandonment_proposed_at=NULL,updated_at=NOW()
         WHERE id=$1`, [id],
      );
      await event(client, id, actor, "customer-replied", {});
    }
    await event(client, id, actor, "comment-added", { commentId: rows[0].id }, input.internal);
    return rows[0];
  });
  res.status(201).json(result);
}));
router.get("/:id/events", route(async (req, res) => {
  const actor = actorFor(req);
  const id = parse(idSchema, req.params.id);
  await readTicket(pool, id, actor);
  const { rows } = await pool.query(
    "SELECT * FROM ticket_events WHERE ticket_id=$1 AND (NOT internal OR $2) ORDER BY id", [id, isTicketStaff(actor)],
  );
  res.json(rows);
}));

router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof TicketError) return res.status(error.status).json({ success: false, error: error.message });
  console.error("[TICKETS] Persistent operation failed:", error);
  return res.status(503).json({ success: false, error: "Ticket service unavailable. No successful write is confirmed; please retry." });
});
export default router;

import { z } from "zod";

export const TICKET_STATUSES = [
  "open", "in-progress", "pending", "resolved", "closed", "withdrawn", "abandoned", "voided",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export const PENDING_REASONS = ["customer", "internal", "third-party", "approval"] as const;
export const RESOLUTION_CODES = ["fixed", "workaround", "no-fault-found", "duplicate", "user-error", "cannot-reproduce"] as const;
export const AUTO_CLOSE_DAYS = 3;
export const TICKET_TYPES = ["incident", "request", "problem", "change"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];
export const APPROVAL_DECISIONS = ["approved", "rejected"] as const;
// The SLA clock stops only while we wait on someone outside the support team.
export const SLA_PAUSING_REASONS: readonly string[] = ["customer", "third-party"];
export const SLA_HOURS = { low: 72, medium: 24, high: 8, critical: 2 } as const;
// A ticket is "at risk" once less than this share of its target time remains.
export const SLA_AT_RISK_FRACTION = 0.25;
export const MAX_TIME_ENTRY_MINUTES = 1440;
export const TERMINAL_STATUSES: readonly string[] = ["resolved", "closed", "withdrawn", "abandoned", "voided"];

export interface TicketActor {
  id: number;
  role: string;
  owner: boolean;
}
export interface TicketAccessRecord {
  reporter_id: number | null;
  assignee_id: number | null;
  status: string;
  ticket_type?: string;
  approval_status?: string;
}
export const isTicketStaff = (actor: TicketActor) =>
  actor.owner || ["admin", "moderator", "tsr"].includes(actor.role);
export const isTicketManager = (actor: TicketActor) => actor.owner || actor.role === "admin";
export function canReadTicket(actor: TicketActor, ticket: TicketAccessRecord): boolean {
  if (isTicketManager(actor)) return true;
  if (isTicketStaff(actor)) return ticket.assignee_id === null || ticket.assignee_id === actor.id;
  return ticket.reporter_id === actor.id;
}
export function canWorkTicket(actor: TicketActor, ticket: TicketAccessRecord): boolean {
  return isTicketStaff(actor) && canReadTicket(actor, ticket) &&
    (isTicketManager(actor) || ticket.assignee_id === actor.id);
}

const transitions: Record<TicketStatus, readonly TicketStatus[]> = {
  open: ["in-progress", "pending", "withdrawn", "voided"],
  "in-progress": ["pending", "resolved", "withdrawn", "voided"],
  pending: ["in-progress", "withdrawn", "abandoned", "voided"],
  resolved: ["closed", "open", "in-progress", "voided"],
  closed: ["open", "in-progress", "voided"],
  withdrawn: ["open", "in-progress", "voided"],
  abandoned: ["open", "in-progress", "voided"],
  voided: ["open", "in-progress"],
};
export function transitionError(
  actor: TicketActor,
  ticket: TicketAccessRecord,
  next: TicketStatus,
): string | null {
  if (!canReadTicket(actor, ticket)) return "Ticket not found";
  const from = z.enum(TICKET_STATUSES).safeParse(ticket.status);
  if (!from.success || !transitions[from.data].includes(next)) return "Transition is not allowed";
  if (next === "voided") return actor.owner ? null : "Only the owner can void a ticket";
  if (ticket.status === "voided" && !actor.owner) return "Only the owner can reopen a voided ticket";
  if (next === "withdrawn") {
    return ticket.reporter_id === actor.id || actor.owner ? null : "Only the requester can withdraw this ticket";
  }
  if (next === "in-progress" && ticket.assignee_id === null) return "Assign or claim the ticket first";
  if ((next === "in-progress" || next === "resolved") && ticket.ticket_type === "change" &&
      ticket.approval_status !== "approved") return "A change must be approved before work starts";
  if ((next === "in-progress" || next === "open") && ["resolved", "closed", "withdrawn", "abandoned"].includes(ticket.status) &&
      ticket.reporter_id === actor.id) return null;
  if (!canWorkTicket(actor, ticket)) return "Claim this ticket before changing its status";
  if (next === "abandoned" && !isTicketManager(actor)) return "Manager approval is required";
  return null;
}

export function approvalError(
  actor: TicketActor,
  ticket: TicketAccessRecord,
  decision: (typeof APPROVAL_DECISIONS)[number],
): string | null {
  if (!isTicketManager(actor)) return "Only a manager can approve a change";
  if (ticket.ticket_type !== "change") return "Only change tickets need approval";
  if (TERMINAL_STATUSES.includes(ticket.status)) return "Reopen the ticket before deciding";
  if (ticket.approval_status !== "pending") return "This change has already been decided";
  if (decision === "approved" && ticket.reporter_id === actor.id && !actor.owner) {
    return "You cannot approve a change you requested";
  }
  return null;
}
export const isSlaPaused = (ticket: { status: string; pending_reason: string | null }) =>
  ticket.status === "pending" && SLA_PAUSING_REASONS.includes(ticket.pending_reason ?? "");
export function slaPauseMs(
  ticket: { status: string; pending_reason: string | null; pending_since: string | Date | null },
  now: Date,
): number {
  if (!ticket.pending_since || !isSlaPaused(ticket)) return 0;
  return Math.max(0, now.getTime() - new Date(ticket.pending_since).getTime());
}

export type ActiveSlaState = "breached" | "at-risk" | "paused" | "on-track";
export interface SlaTicketRow {
  id: number;
  title: string;
  priority: TicketPriority;
  status: string;
  ticket_type: TicketType;
  pending_reason: string | null;
  sla_due_at: string | Date | null;
  sla_target_hours: number | null;
}
export function activeSlaState(ticket: SlaTicketRow, now: Date): ActiveSlaState | null {
  if (TERMINAL_STATUSES.includes(ticket.status) || !ticket.sla_due_at) return null;
  if (isSlaPaused(ticket)) return "paused";
  const remaining = new Date(ticket.sla_due_at).getTime() - now.getTime();
  if (remaining <= 0) return "breached";
  const targetHours = ticket.sla_target_hours ?? SLA_HOURS[ticket.priority] ?? 24;
  return remaining <= targetHours * 3600000 * SLA_AT_RISK_FRACTION ? "at-risk" : "on-track";
}
export interface SlaAttentionItem {
  id: number;
  title: string;
  priority: TicketPriority;
  status: string;
  ticket_type: TicketType;
  sla_due_at: string;
  state: "breached" | "at-risk";
}
export interface SlaActiveSummary {
  total: number;
  breached: number;
  atRisk: number;
  paused: number;
  onTrack: number;
}
export function summarizeActiveSla(rows: SlaTicketRow[], now: Date, limit = 25) {
  const active: SlaActiveSummary = { total: 0, breached: 0, atRisk: 0, paused: 0, onTrack: 0 };
  const attention: SlaAttentionItem[] = [];
  for (const row of rows) {
    const state = activeSlaState(row, now);
    if (!state) continue;
    active.total += 1;
    if (state === "paused") active.paused += 1;
    else if (state === "on-track") active.onTrack += 1;
    else {
      if (state === "breached") active.breached += 1; else active.atRisk += 1;
      attention.push({
        id: row.id, title: row.title, priority: row.priority, status: row.status,
        ticket_type: row.ticket_type, sla_due_at: new Date(row.sla_due_at!).toISOString(), state,
      });
    }
  }
  attention.sort((a, b) => (a.state === b.state ? 0 : a.state === "breached" ? -1 : 1) ||
    a.sla_due_at.localeCompare(b.sla_due_at) || a.id - b.id);
  return { active, attention: attention.slice(0, limit) };
}
export const slaComplianceRate = (met: number, breached: number) =>
  met + breached === 0 ? null : met / (met + breached);
// "h" and "min" read the same in English, French and Spanish, so no translated copy is needed.
export function formatMinutes(minutes: number): string {
  const total = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
export interface SlaBreakdown {
  key: string;
  created: number;
  resolved: number;
  met: number;
  breached: number;
  complianceRate: number | null;
  avgResolutionHours: number | null;
  medianResolutionHours: number | null;
  timeSpentMinutes: number;
}
export interface SlaReport extends SlaBreakdown {
  windowDays: number;
  generatedAt: string;
  active: SlaActiveSummary;
  byPriority: SlaBreakdown[];
  byType: SlaBreakdown[];
  attention: SlaAttentionItem[];
}

export interface ProblemLinkTarget { id: number; ticket_type: string; status: string }
// Only the worker (or a manager) changes a ticket's problem link, and only while both sides are open.
export function problemLinkError(
  actor: TicketActor,
  ticket: TicketAccessRecord & { id: number },
  problem: ProblemLinkTarget | null,
): { status: 403 | 409; message: string } | null {
  if (!canWorkTicket(actor, ticket)) return { status: 403, message: "Assigned staff access required" };
  if (TERMINAL_STATUSES.includes(ticket.status)) {
    return { status: 409, message: "Reopen the ticket before changing its linked problem" };
  }
  if (!problem) return null;
  if (ticket.ticket_type === "problem") return { status: 409, message: "A problem cannot be linked to another problem" };
  if (problem.ticket_type !== "problem") return { status: 409, message: "Only a problem ticket can be linked" };
  if (TERMINAL_STATUSES.includes(problem.status)) {
    return { status: 409, message: "Reopen the problem before linking tickets to it" };
  }
  return null;
}

const reason = z.string().trim().min(1).max(2000);
export const createTicketSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  priority: z.enum(TICKET_PRIORITIES).default("medium"),
  category: z.string().trim().min(1).max(60).default("general"),
  type: z.enum(TICKET_TYPES).default("incident"),
}).strict();
export const approvalSchema = z.object({
  decision: z.enum(APPROVAL_DECISIONS),
  reason: z.string().trim().min(1).max(2000),
}).strict();
export const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  reason,
  pendingReason: z.enum(PENDING_REASONS).optional(),
  followUpAt: z.string().datetime({ offset: true }).optional(),
  duplicateOf: z.number().int().positive().optional(),
  resolutionCode: z.enum(RESOLUTION_CODES).optional(),
  resolutionNotes: z.string().trim().min(1).max(2000).optional(),
}).strict().refine((value) => value.status !== undefined || value.priority !== undefined, "No change specified")
  .refine((value) => value.status !== "pending" || Boolean(value.pendingReason && value.followUpAt),
    "Pending requires a reason and follow-up date")
  .refine((value) => value.status !== "resolved" || Boolean(value.resolutionCode && value.resolutionNotes),
    "Resolving requires a resolution code and notes");
export const commentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  internal: z.boolean().default(false),
  timeSpentMinutes: z.number().int().min(1).max(MAX_TIME_ENTRY_MINUTES).optional(),
}).strict();
export const linkProblemSchema = z.object({
  problemId: z.number().int().positive().max(2147483647).nullable(),
}).strict();
export const assignTicketSchema = z.object({
  assigneeId: z.number().int().positive().nullable(),
  team: z.string().trim().max(80).nullable().optional(),
  reason,
}).strict();

export interface SupportTicket extends TicketAccessRecord {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: (typeof TICKET_PRIORITIES)[number];
  category: string;
  reporter: string | null;
  team: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_code: string | null;
  resolution_notes: string | null;
  ticket_type: TicketType;
  approval_status: "not-required" | "pending" | "approved" | "rejected";
  approved_by: number | null;
  approved_at: string | null;
  escalation_level: number;
  problem_id: number | null;
  time_spent_minutes: number;
  pending_reason: string | null;
  pending_since: string | null;
  follow_up_at: string | null;
  sla_due_at: string | null;
  sla_breached: boolean;
  abandonment_proposed_at: string | null;
  conversation_id: number | null;
}
export type TicketLink = Pick<SupportTicket, "id" | "title" | "status" | "priority" | "ticket_type">;
export interface TicketLinks {
  problem: TicketLink | null;
  related: TicketLink[];
}

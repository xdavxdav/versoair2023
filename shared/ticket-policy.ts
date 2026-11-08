import { z } from "zod";

export const TICKET_STATUSES = [
  "open", "in-progress", "pending", "resolved", "closed", "withdrawn", "abandoned", "voided",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const PENDING_REASONS = ["customer", "internal", "third-party", "approval"] as const;
export const RESOLUTION_CODES = ["fixed", "workaround", "no-fault-found", "duplicate", "user-error", "cannot-reproduce"] as const;
export const AUTO_CLOSE_DAYS = 3;
export const TICKET_TYPES = ["incident", "request", "problem", "change"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];
export const APPROVAL_DECISIONS = ["approved", "rejected"] as const;
// The SLA clock stops only while we wait on someone outside the support team.
export const SLA_PAUSING_REASONS: readonly string[] = ["customer", "third-party"];
export const SLA_HOURS = { low: 72, medium: 24, high: 8, critical: 2 } as const;
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
export function slaPauseMs(
  ticket: { status: string; pending_reason: string | null; pending_since: string | Date | null },
  now: Date,
): number {
  if (ticket.status !== "pending" || !ticket.pending_since) return 0;
  if (!ticket.pending_reason || !SLA_PAUSING_REASONS.includes(ticket.pending_reason)) return 0;
  return Math.max(0, now.getTime() - new Date(ticket.pending_since).getTime());
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
  pending_reason: string | null;
  pending_since: string | null;
  follow_up_at: string | null;
  sla_due_at: string | null;
  sla_breached: boolean;
  abandonment_proposed_at: string | null;
  conversation_id: number | null;
}

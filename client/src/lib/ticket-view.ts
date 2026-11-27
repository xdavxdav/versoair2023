import {
  activeSlaState,
  isSlaPaused,
  SLA_HOURS,
  TERMINAL_STATUSES,
  type SupportTicket,
  type TicketPriority,
} from "@shared/ticket-policy";

export type QuickView = "all" | "mine" | "unassigned" | "atRisk" | "late";
export const QUICK_VIEWS: readonly QuickView[] = ["all", "mine", "unassigned", "atRisk", "late"];

const isClosed = (ticket: Pick<SupportTicket, "status">) => TERMINAL_STATUSES.includes(ticket.status);

// A ticket whose clock is paused (waiting on the customer or a third party) is not late, whatever the stored due date says.
export function isTicketLate(ticket: SupportTicket, now: number): boolean {
  if (isClosed(ticket) || isSlaPaused(ticket)) return false;
  if (ticket.sla_breached === true) return true;
  return !!ticket.sla_due_at && new Date(ticket.sla_due_at).getTime() < now;
}

export function ticketSlaState(ticket: SupportTicket, now: number) {
  return activeSlaState({ ...ticket, sla_target_hours: null }, new Date(now));
}

export function matchesQuickView(view: QuickView, ticket: SupportTicket, actorId: number, now: number): boolean {
  switch (view) {
    case "mine": return ticket.assignee_id === actorId;
    case "unassigned": return !isClosed(ticket) && !ticket.assignee_id;
    case "atRisk": return ticketSlaState(ticket, now) === "at-risk";
    case "late": return isTicketLate(ticket, now);
    default: return true;
  }
}

export const STAGES = ["received", "assigned", "working", "resolved"] as const;
export type Stage = (typeof STAGES)[number];
export interface TicketProgress {
  index: number;
  ended: boolean;
  waiting: boolean;
  waitingOn: string | null;
}

// Requesters do not receive pending_reason, so "waiting" can be true while the reason is unknown.
export function ticketProgress(ticket: SupportTicket): TicketProgress {
  const endedStates = ["withdrawn", "abandoned", "voided"];
  if (endedStates.includes(ticket.status)) return { index: -1, ended: true, waiting: false, waitingOn: null };
  if (ticket.status === "resolved" || ticket.status === "closed") return { index: 3, ended: false, waiting: false, waitingOn: null };
  const awaitingApproval = ticket.ticket_type === "change" && ticket.approval_status === "pending";
  if (ticket.status === "pending") {
    return { index: 2, ended: false, waiting: true, waitingOn: ticket.pending_reason ?? null };
  }
  if (ticket.status === "in-progress") {
    return { index: 2, ended: false, waiting: awaitingApproval, waitingOn: awaitingApproval ? "approval" : null };
  }
  return {
    index: ticket.assignee_id ? 1 : 0,
    ended: false,
    waiting: awaitingApproval,
    waitingOn: awaitingApproval ? "approval" : null,
  };
}

export const URGENCIES = ["whenever", "normal", "blocking", "emergency"] as const;
export type Urgency = (typeof URGENCIES)[number];
export const URGENCY_PRIORITY: Record<Urgency, TicketPriority> = {
  whenever: "low",
  normal: "medium",
  blocking: "high",
  emergency: "critical",
};
export const targetHours = (urgency: Urgency) => SLA_HOURS[URGENCY_PRIORITY[urgency]];

export const CATEGORIES = ["general", "account", "billing", "listing", "technical", "feedback"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface TicketDraft {
  type: string;
  title: string;
  category: Category;
  urgency: Urgency;
  what: string;
  expected: string;
  steps: string;
}
export const EMPTY_DRAFT: TicketDraft = {
  type: "incident", title: "", category: "general", urgency: "normal", what: "", expected: "", steps: "",
};

// Drafts live in the browser only, so anything read back is untrusted and must be re-validated.
export function parseDraft(raw: string | null): TicketDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof TicketDraft, unknown>>;
    const text = (field: unknown, max: number) => (typeof field === "string" ? field.slice(0, max) : "");
    const draft: TicketDraft = {
      type: ["incident", "request", "problem", "change"].includes(String(value.type)) ? String(value.type) : "incident",
      title: text(value.title, 200),
      category: CATEGORIES.includes(value.category as Category) ? (value.category as Category) : "general",
      urgency: URGENCIES.includes(value.urgency as Urgency) ? (value.urgency as Urgency) : "normal",
      what: text(value.what, 3000),
      expected: text(value.expected, 1000),
      steps: text(value.steps, 1000),
    };
    return draft.title || draft.what || draft.expected || draft.steps ? draft : null;
  } catch {
    return null;
  }
}

export interface DescriptionLabels { what: string; expected: string; steps: string }
// The API stores one description field, so the guided answers are folded into labelled sections.
export function composeDescription(draft: TicketDraft, labels: DescriptionLabels): string {
  const parts: string[] = [];
  if (draft.what.trim()) parts.push(draft.what.trim());
  if (draft.expected.trim()) parts.push(`${labels.expected}: ${draft.expected.trim()}`);
  if (draft.steps.trim()) parts.push(`${labels.steps}: ${draft.steps.trim()}`);
  return parts.join("\n\n").slice(0, 5000);
}

const words = (value: string) =>
  new Set(value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 4));

// Suggests the requester's own open tickets that look like the one being written, to avoid duplicates.
export function findSimilarTickets(tickets: SupportTicket[], title: string, limit = 3): SupportTicket[] {
  const wanted = words(title);
  if (wanted.size < 2) return [];
  return tickets
    .filter((ticket) => !isClosed(ticket))
    .map((ticket) => {
      const shared = [...words(ticket.title)].filter((word) => wanted.has(word)).length;
      return { ticket, shared };
    })
    .filter((entry) => entry.shared >= 2)
    .sort((a, b) => b.shared - a.shared || b.ticket.id - a.ticket.id)
    .slice(0, limit)
    .map((entry) => entry.ticket);
}

export interface RawComment {
  id: number; author_name: string; body: string; internal: boolean; created_at: string; time_spent_minutes?: number | null;
}
export interface RawEvent {
  id: number; kind: string; details: Record<string, unknown>; created_at: string; internal: boolean;
}
export type TimelineItem =
  | { key: string; at: string; type: "reply" | "note"; author: string; body: string; minutes: number }
  | { key: string; at: string; type: "event"; kind: string; internal: boolean; details: Record<string, unknown> };

// comment-added and time-logged duplicate information the comment itself already carries.
const COVERED_BY_COMMENT = new Set(["comment-added", "time-logged"]);

// A status change writes a public "updated" event and then an internal "update-details" event with the staff reason.
// They describe one change, so the reason is folded into the public entry and the second event is not shown twice.
function foldUpdateDetails(events: RawEvent[]): RawEvent[] {
  const sorted = [...events].sort((a, b) => a.id - b.id);
  const folded: RawEvent[] = [];
  for (const entry of sorted) {
    const previous = folded[folded.length - 1];
    if (entry.kind === "update-details" && previous?.kind === "updated" && previous.id === entry.id - 1) {
      const reason = entry.details?.reason;
      if (typeof reason === "string") previous.details = { ...previous.details, reason };
      continue;
    }
    folded.push({ ...entry, details: { ...(entry.details ?? {}) } });
  }
  return folded;
}

export function buildTimeline(comments: RawComment[], events: RawEvent[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...comments.map((comment): TimelineItem => ({
      key: `c${comment.id}`, at: comment.created_at, type: comment.internal ? "note" : "reply",
      author: comment.author_name, body: comment.body, minutes: comment.time_spent_minutes ?? 0,
    })),
    ...foldUpdateDetails(events).filter((entry) => !COVERED_BY_COMMENT.has(entry.kind)).map((entry): TimelineItem => ({
      key: `e${entry.id}`, at: entry.created_at, type: "event", kind: entry.kind,
      internal: entry.internal, details: entry.details,
    })),
  ];
  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.key.localeCompare(b.key));
}

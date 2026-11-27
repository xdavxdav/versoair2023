export interface TicketNotice {
  title: string;
  message: string;
  actionUrl: string;
}

interface TicketRef { id: number; title: string }
interface Queryable { query: (sql: string, values: unknown[]) => Promise<unknown> }

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
const actionUrl = (ticket: TicketRef) => `/tickets?ticket=${ticket.id}`;

// Staff-only activity (internal notes, the actor's own actions) never reaches the requester.
export function shouldNotifyRequester(input: { actorId: number; reporterId: number | null; internal?: boolean }): boolean {
  return input.reporterId !== null && input.reporterId !== input.actorId && input.internal !== true;
}

export function replyNotice(ticket: TicketRef): TicketNotice {
  return {
    title: `New reply on ticket #${ticket.id}`,
    message: clip(ticket.title, 80),
    actionUrl: actionUrl(ticket),
  };
}

// The requester never sees why a ticket is pending, so only "customer" produces a call to action.
export function statusNotice(ticket: TicketRef, change: { from: string; to: string; pendingReason?: string | null }): TicketNotice | null {
  if (change.from === change.to) return null;
  const headline = clip(ticket.title, 80);
  const base = { actionUrl: actionUrl(ticket) };
  switch (change.to) {
    case "in-progress": return { ...base, title: `Work started on ticket #${ticket.id}`, message: headline };
    case "pending":
      return change.pendingReason === "customer"
        ? { ...base, title: `We need a reply on ticket #${ticket.id}`, message: headline }
        : { ...base, title: `Ticket #${ticket.id} is on hold`, message: headline };
    case "resolved": return { ...base, title: `Ticket #${ticket.id} was resolved`, message: `${headline}. Reply if it is not fixed.` };
    case "closed": return { ...base, title: `Ticket #${ticket.id} was closed`, message: headline };
    default: return { ...base, title: `Ticket #${ticket.id} is now ${change.to}`, message: headline };
  }
}

// Notifications are a courtesy: a failure here must never undo or fail the ticket change that already committed.
export async function notifyRequester(db: Queryable, userId: number | null, notice: TicketNotice | null): Promise<void> {
  if (userId === null || notice === null) return;
  try {
    await db.query(
      "INSERT INTO notifications (user_id, type, title, message, action_url, created_at) VALUES ($1, 'ticket', $2, $3, $4, NOW())",
      [userId, notice.title, notice.message, notice.actionUrl],
    );
  } catch (error) {
    console.error("ticket notification failed", error instanceof Error ? error.message : error);
  }
}

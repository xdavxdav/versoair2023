import { TERMINAL_STATUSES } from "@shared/ticket-policy";
import { isTicketLate } from "@/lib/ticket-view";
import { Avatar, ICONS, Icon, SlaChip, Tag, TypeIcon, priorityTone, type ListTicket, type Translate } from "./ticket-ui";

interface Props {
  ticket: ListTicket;
  actorId: number;
  staff: boolean;
  now: number;
  t: Translate;
  alert: boolean;
  onOpen: (id: number) => void;
  onClaim?: (id: number) => void;
}

export function TicketRow({ ticket, actorId, staff, now, t, alert, onOpen, onClaim }: Props) {
  const done = TERMINAL_STATUSES.includes(ticket.status);
  const late = isTicketLate(ticket, now);
  const state = done ? "closed" : late ? "breach" : ticket.status === "pending" ? "paused" : "open";
  const mine = ticket.assignee_id === actorId;
  const assignee = ticket.assignee_id ? (mine ? t("you") : ticket.assignee_name ?? `#${ticket.assignee_id}`) : t("unassigned");
  return <article className="sw-row" data-state={state} data-priority={ticket.priority}>
    <button type="button" className="sw-row-main" onClick={() => onOpen(ticket.id)} aria-label={`${t("openDetails")} #${ticket.id}`}>
      <span className="sw-row-icon"><TypeIcon type={ticket.ticket_type ?? "incident"} /></span>
      <span className="sw-row-body">
        <span className="sw-row-top">
          <span className="sw-tid">#{ticket.id}</span>
          <Tag tone={done ? "sw-tag-closed" : "sw-tag-open"}>{t(ticket.status)}</Tag>
          <Tag tone={priorityTone(ticket.priority)}>{t(ticket.priority)}</Tag>
          {alert && <Tag tone="sw-tag-red">{t("alerts")}</Tag>}
          {ticket.abandonment_proposed_at && staff && <Tag tone="sw-tag-brand">{t("abandonment")}</Tag>}
        </span>
        <span className="sw-row-title">{ticket.title}</span>
        <span className="sw-row-meta">
          {t(ticket.ticket_type ?? "incident")} · {ticket.category}{staff && ticket.reporter ? ` · ${ticket.reporter}` : ""}
        </span>
      </span>
    </button>
    <span className="sw-row-side">
      <SlaChip ticket={ticket} now={now} t={t} />
      <span className="sw-row-assignee" title={t("assignee")}>
        <Avatar name={ticket.assignee_id ? (mine ? t("you") : ticket.assignee_name ?? "") : ""} />
        <span>{assignee}</span>
      </span>
      {staff && onClaim && !ticket.assignee_id && !done &&
        <button type="button" className="sw-mini" onClick={() => onClaim(ticket.id)}><Icon d={ICONS.user} />{t("claim")}</button>}
    </span>
  </article>;
}

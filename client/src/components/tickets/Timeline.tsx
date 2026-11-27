import { formatMinutes, type TicketStatus } from "@shared/ticket-policy";
import type { TimelineItem } from "@/lib/ticket-view";
import { ICONS, Icon, dateText, type Translate } from "./ticket-ui";

const EVENT_KEY = {
  created: "eventCreated",
  updated: "eventUpdated",
  "customer-replied": "eventCustomerReplied",
  assigned: "eventAssigned",
  escalated: "eventEscalated",
  "change-approved": "eventApproved",
  "change-rejected": "eventRejected",
  "problem-linked": "eventProblemLinked",
  "problem-unlinked": "eventProblemUnlinked",
  "incident-linked": "eventIncidentLinked",
  "incident-unlinked": "eventIncidentUnlinked",
  "auto-closed": "eventAutoClosed",
  "follow-up": "eventFollowUp",
  "sla-breach": "eventSlaBreach",
  "abandonment-proposed": "eventAbandonment",
} as const;

const isStatus = (value: unknown): value is TicketStatus => typeof value === "string" && value.length > 0;

function eventDetail(item: Extract<TimelineItem, { type: "event" }>, t: Translate): string {
  const { details } = item;
  const parts: string[] = [];
  if (item.kind === "updated") {
    if (isStatus(details.from) && isStatus(details.to) && details.from !== details.to) {
      parts.push(`${t(details.from)} → ${t(details.to)}`);
    }
    if (details.previousPriority && details.priority && details.previousPriority !== details.priority) {
      parts.push(`${t("priorityChanged")}: ${String(details.previousPriority)} → ${String(details.priority)}`);
    }
  }
  if (item.kind === "escalated" && typeof details.level === "number") parts.push(`${t("escalationLevel")}: ${details.level}`);
  if (typeof details.reason === "string" && details.reason.trim()) parts.push(details.reason);
  return parts.join(" · ");
}

export function Timeline({ items, staff, t }: { items: TimelineItem[]; staff: boolean; t: Translate }) {
  if (!items.length) return null;
  return <ol className="sw-timeline">
    {items.map((item) => {
      if (item.type === "event") {
        const key = EVENT_KEY[item.kind as keyof typeof EVENT_KEY];
        const detail = eventDetail(item, t);
        return <li key={item.key} className="sw-tl sw-tl-event">
          <span className="sw-tl-dot" aria-hidden="true" />
          <div className="sw-tl-body">
            <p><b>{key ? t(key) : item.kind}</b>{item.internal && <span className="sw-tl-lock"><Icon d={ICONS.lock} />{t("staffOnly")}</span>}</p>
            {detail && <p className="sw-meta sw-pre">{detail}</p>}
            <time className="sw-meta" dateTime={item.at}>{dateText(item.at)}</time>
          </div>
        </li>;
      }
      return <li key={item.key} className={`sw-tl sw-tl-${item.type}`}>
        <span className="sw-tl-dot" aria-hidden="true" />
        <div className="sw-tl-body">
          <p className="sw-tl-who"><b>{item.author}</b>
            {item.type === "note" ? <span className="sw-tl-lock"><Icon d={ICONS.lock} />{t("staffOnly")}</span> : <span className="sw-meta">{t("reply")}</span>}
            {staff && item.minutes > 0 && <span className="sw-meta">· {formatMinutes(item.minutes)}</span>}</p>
          <p className="sw-bubble sw-pre">{item.body}</p>
          <time className="sw-meta" dateTime={item.at}>{dateText(item.at)}</time>
        </div>
      </li>;
    })}
  </ol>;
}

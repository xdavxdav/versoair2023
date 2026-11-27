import type { ReactNode } from "react";
import { TERMINAL_STATUSES, isSlaPaused } from "@shared/ticket-policy";
import type { SupportTicket } from "@shared/ticket-policy";
import { isTicketLate } from "@/lib/ticket-view";
import type { useSupportCopy } from "@/hooks/use-support-copy";

export type Translate = ReturnType<typeof useSupportCopy>;
// The list route adds the assignee's name for staff; requesters never receive it.
export type ListTicket = SupportTicket & { assignee_name?: string | null };

export const ICONS = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  clear: "M18 6 6 18M6 6l12 12",
  chevron: "m6 9 6 6 6-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  check: "M20 6 9 17l-5-5",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  plus: "M12 5v14M5 12h14",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  pause: "M10 5v14M14 5v14",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z",
  incident: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  request: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01",
  problem: "M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM11 8v3l2 1",
  change: "M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3",
} as const;

export function Icon({ d, className }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><path d={d} /></svg>;
}

export const priorityTone = (priority: string) => (priority === "critical" || priority === "high" ? "sw-tag-red" : "sw-tag-med");

export function Tag({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`sw-tag ${tone}`}>{children}</span>;
}

export const dateText = (value: string) => new Date(value).toLocaleString();

// Plain-language countdown such as "3h 20m" or "2d".
export function relativeDue(due: string, now: number): string {
  const minutes = Math.max(1, Math.round(Math.abs(new Date(due).getTime() - now) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days >= 1) return `${days}d${hours ? ` ${hours}h` : ""}`;
  if (hours >= 1) return `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
  return `${minutes}m`;
}

export function SlaChip({ ticket, now, t }: { ticket: SupportTicket; now: number; t: Translate }) {
  if (TERMINAL_STATUSES.includes(ticket.status)) return <span className="sw-sla sw-sla-done"><Icon d={ICONS.check} />{t(ticket.status)}</span>;
  if (isSlaPaused(ticket)) return <span className="sw-sla sw-sla-paused"><Icon d={ICONS.pause} />{t("paused")}</span>;
  if (!ticket.sla_due_at) return <span className="sw-sla sw-sla-done"><Icon d={ICONS.clock} />{t("noTarget")}</span>;
  const text = relativeDue(ticket.sla_due_at, now);
  const late = isTicketLate(ticket, now);
  return <span className={`sw-sla ${late ? "sw-sla-late" : "sw-sla-ok"}`} title={dateText(ticket.sla_due_at)}>
    <Icon d={ICONS.clock} />{late ? `${t("pastTarget")} · ${text}` : `${t("dueIn")} ${text}`}
  </span>;
}

export function Avatar({ name }: { name: string | null | undefined }) {
  const initials = (name ?? "").trim().slice(0, 2).toUpperCase();
  return <span className={`sw-avatar${initials ? "" : " is-empty"}`} aria-hidden="true">{initials || "?"}</span>;
}

export function TypeIcon({ type }: { type: string }) {
  const d = (ICONS as Record<string, string>)[type] ?? ICONS.incident;
  return <Icon d={d} className="sw-type-icon" />;
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return <div className="sw-skel" aria-hidden="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="sw-skel-row" />)}</div>;
}

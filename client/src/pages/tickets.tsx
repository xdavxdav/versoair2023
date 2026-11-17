import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { errorText, ticketRequest } from "@/lib/support-api";
import { useOwnerAccess } from "@/hooks/use-owner-access";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TicketSlaReport } from "@/components/TicketSlaReport";
import {
  canWorkTicket, formatMinutes, isTicketManager, isTicketStaff, MAX_TIME_ENTRY_MINUTES, PENDING_REASONS, RESOLUTION_CODES,
  TERMINAL_STATUSES, TICKET_TYPES, TICKET_PRIORITIES, TICKET_STATUSES, transitionError,
  type SupportTicket, type TicketActor, type TicketLink, type TicketLinks, type TicketStatus,
} from "@shared/ticket-policy";

import "./tickets-workspace.css";

const selectClass = "min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900 max-w-full";
const SORTS = ["target", "newest", "openFirst"] as const;
type Sort = (typeof SORTS)[number];

function Icon({ d, className }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><path d={d} /></svg>;
}
const ICONS = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  clear: "M18 6 6 18M6 6l12 12",
  chevron: "m6 9 6 6 6-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  check: "M20 6 9 17l-5-5",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  plus: "M12 5v14M5 12h14",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};

export function Tickets() {
  const { user } = useAuthContext();
  const owner = useOwnerAccess();
  const t = useSupportCopy();
  const client = useQueryClient();
  const actor: TicketActor = { id: Number(user?.id), role: user?.role || "user", owner: owner.data?.isOwner === true };
  const staff = isTicketStaff(actor);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sort, setSort] = useState<Sort>("target");
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get("ticket");
    return value && /^[1-9]\d{0,8}$/.test(value) ? Number(value) : null;
  });
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ticketType, setTicketType] = useState<(typeof TICKET_TYPES)[number]>("incident");
  const tickets = useQuery<SupportTicket[]>({
    queryKey: ["support-tickets", user?.id],
    enabled: Boolean(user),
    queryFn: () => ticketRequest("/api/tickets"),
    refetchInterval: 15000,
  });
  const alerts = useQuery<{ id: number; ticket_id: number; kind: string; message: string }[]>({
    queryKey: ["support-alerts", user?.id],
    enabled: Boolean(user) && staff,
    queryFn: () => ticketRequest("/api/tickets/alerts"),
    refetchInterval: 15000,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["support-tickets"] });
    void client.invalidateQueries({ queryKey: ["support-alerts"] });
    void client.invalidateQueries({ queryKey: ["support-detail"] });
    void client.invalidateQueries({ queryKey: ["support-links"] });
    void client.invalidateQueries({ queryKey: ["support-sla-report"] });
  };
  const create = useMutation({
    mutationFn: () => ticketRequest<SupportTicket>("/api/tickets", "POST", { title, description, type: ticketType }),
    onSuccess: (ticket) => { setCreating(false); setTitle(""); setDescription(""); setTicketType("incident"); setSelectedId(ticket.id); refresh(); },
  });
  const selected = tickets.data?.find((ticket) => ticket.id === selectedId);
  const now = Date.now();
  const isLate = (ticket: SupportTicket) => !TERMINAL_STATUSES.includes(ticket.status) &&
    (ticket.sla_breached === true || (!!ticket.sla_due_at && new Date(ticket.sla_due_at).getTime() < now));
  const dueTime = (ticket: SupportTicket) => ticket.sla_due_at ? new Date(ticket.sla_due_at).getTime() : Number.MAX_SAFE_INTEGER;
  const visible = (tickets.data?.filter((ticket) =>
    (status === "all" || ticket.status === status) &&
    (priorityFilter === "all" || ticket.priority === priorityFilter) &&
    (!mineOnly || ticket.assignee_id === actor.id) &&
    `${ticket.id} ${ticket.title} ${ticket.description || ""}`.toLowerCase().includes(search.toLowerCase()),
  ) || []).sort((a, b) => {
    const aDone = TERMINAL_STATUSES.includes(a.status) ? 1 : 0;
    const bDone = TERMINAL_STATUSES.includes(b.status) ? 1 : 0;
    if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id;
    if (aDone !== bDone) return aDone - bDone;
    return sort === "target" ? dueTime(a) - dueTime(b) || a.id - b.id : b.id - a.id;
  });
  // Staff can only link to problems they can read, which is exactly what their own list contains.
  const openProblems = staff
    ? (tickets.data ?? []).filter((ticket) => ticket.ticket_type === "problem" && !TERMINAL_STATUSES.includes(ticket.status))
    : [];

  const all = tickets.data ?? [];
  const live = all.filter((ticket) => !TERMINAL_STATUSES.includes(ticket.status));
  const kpi = {
    open: live.length,
    unassigned: live.filter((ticket) => !ticket.assignee_id).length,
    late: live.filter(isLate).length,
    closed: all.length - live.length,
  };
  const dateText = (value: string) => new Date(value).toLocaleString();
  const alerted = new Set((alerts.data ?? []).map((alert) => alert.ticket_id));
  const staffTickets = [...live].filter((ticket) => !alerted.has(ticket.id)).sort((a, b) => dueTime(a) - dueTime(b) || a.id - b.id).slice(0, 5);

  return <main className="sw" data-testid="ticket-workspace">
    <div className="sw-shell">
      <header className="sw-hero">
        <div className="sw-hero-in">
          <div><h1>{staff ? t("workspace") : t("tickets")}</h1>
            <p className="sw-hero-sub">{staff ? t("scope") : t("policy")}</p></div>
          <div className="sw-hero-actions">
            {(actor.owner || actor.role === "admin") && <Link href="/geo-admin/dashboard" className="sw-btn sw-btn-ghost">{t(actor.owner ? "ownerPanel" : "adminPanel")}</Link>}
            <button type="button" className="sw-btn sw-btn-teal" onClick={refresh}><Icon d={ICONS.refresh} />{t("refresh")}</button>
            <button type="button" className="sw-btn sw-btn-amber" onClick={() => setCreating(true)}><Icon d={ICONS.plus} />{t("create")}</button>
          </div>
        </div>
      </header>
      {staff && <div className="sw-kpis" aria-label="queue summary">
        {([
          ["open", t("open"), kpi.open, t("kpiOpenNote"), ""],
          ["unassigned", t("unassigned"), kpi.unassigned, t("kpiUnassignedNote"), kpi.unassigned ? "is-warn" : ""],
          ["late", t("pastTarget"), kpi.late, t("kpiLateNote"), kpi.late ? "is-alert" : "is-ok"],
          ["closed", t("closed"), kpi.closed, t("kpiClosedNote"), ""],
        ] as const).map(([key, label, value, note, tone]) =>
          <div key={key} className={`sw-kpi ${tone}`}><span className="sw-kpi-k">{label}</span><span className="sw-kpi-v">{value}</span><span className="sw-kpi-n">{note}</span></div>)}
      </div>}
      <div className="sw-toolbar">
        <div className={`sw-search${search ? " has" : ""}`}>
          <Icon d={ICONS.search} />
          <input type="search" aria-label={t("search")} placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className="sw-clr" aria-label={t("clearSearch")} onClick={() => setSearch("")}><Icon d={ICONS.clear} /></button>
        </div>
        <div className="sw-selwrap">
          <select aria-label={t("status")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t("all")}</option>{TICKET_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
          </select><Icon d={ICONS.chevron} />
        </div>
        <div className="sw-selwrap">
          <select aria-label={t("priority")} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">{t("all")}</option>{TICKET_PRIORITIES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
          </select><Icon d={ICONS.chevron} />
        </div>
        <div className="sw-selwrap">
          <select aria-label={t("sort")} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="target">{t("sortTarget")}</option><option value="newest">{t("sortNewest")}</option><option value="openFirst">{t("sortOpenFirst")}</option>
          </select><Icon d={ICONS.chevron} />
        </div>
        {staff && <button type="button" className={`sw-mini sw-mine${mineOnly ? " is-on" : ""}`} aria-pressed={mineOnly} onClick={() => setMineOnly(!mineOnly)}><Icon d={ICONS.user} />{t("mine")}</button>}
        <span className="sw-count" aria-live="polite"><b>{visible.length}</b> {t("of")} {all.length} {t("ticketCount")}</span>
      </div>
      <div className={`sw-layout${staff ? "" : " is-solo"}`}>
      <div className="sw-main">
      {tickets.isPending && <p className="sw-note">{t("loading")}</p>}
      {tickets.isError && <p role="alert" className="sw-note">{errorText(tickets.error)} <button type="button" className="sw-btn" onClick={() => void tickets.refetch()}>{t("retry")}</button></p>}
      {tickets.isSuccess && !visible.length && <div className="sw-empty"><b>{t("empty")}</b></div>}
      <div className="sw-cards">
        {visible.map((ticket) => {
          const done = TERMINAL_STATUSES.includes(ticket.status);
          const late = isLate(ticket);
          return <article key={ticket.id} className="sw-ticket" data-state={done ? "closed" : late ? "breach" : "open"}>
            <div className="sw-t-head">
              <span className="sw-tid">#{ticket.id}</span>
              <span className="sw-tag sw-tag-teal">{t(ticket.ticket_type ?? "incident")}</span>
              <span className={`sw-tag ${done ? "sw-tag-closed" : "sw-tag-open"}`}>{t(ticket.status)}</span>
              <span className={`sw-tag sw-spacer ${ticket.priority === "critical" || ticket.priority === "high" ? "sw-tag-red" : "sw-tag-med"}`}>{t(ticket.priority)}</span>
            </div>
            <h2 className="sw-t-title"><button type="button" onClick={() => setSelectedId(ticket.id)}>{ticket.title}</button></h2>
            {ticket.description && <p className="sw-t-desc">{ticket.description.slice(0, 180)}</p>}
            <dl className="sw-t-fields">
              <div className="sw-f"><dt>{t("category")}</dt><dd>{ticket.category}</dd></div>
              {ticket.team && <div className="sw-f"><dt>{t("team")}</dt><dd>{ticket.team}</dd></div>}
              <div className="sw-f"><dt>{t("assignee")}</dt><dd>{ticket.assignee_id ? (ticket.assignee_id === actor.id ? t("you") : `#${ticket.assignee_id}`) : t("unassigned")}</dd></div>
            </dl>
            <div className="sw-t-foot">
              {ticket.reporter && <p className="sw-submitter">{t("reporter")} <b>{ticket.reporter}</b></p>}
              {ticket.abandonment_proposed_at && staff && <p className="sw-warn">{t("abandonment")}</p>}
              <div className="sw-t-actions">
                {done ? <span className="sw-sla sw-sla-done"><Icon d={ICONS.check} />{t(ticket.status)}</span>
                  : ticket.sla_due_at ? <span className={`sw-sla ${late ? "sw-sla-late" : "sw-sla-ok"}`}><Icon d={ICONS.clock} />{late ? `${t("pastTarget")} · ` : `${t("dueIn")} `}{dateText(ticket.sla_due_at)}</span>
                    : <span className="sw-sla sw-sla-done"><Icon d={ICONS.clock} />{t("noTarget")}</span>}
                <button type="button" className="sw-mini sw-spacer" onClick={() => setSelectedId(ticket.id)}>{t("openDetails")}</button>
              </div>
            </div>
          </article>;
        })}
      </div>
      </div>
      {staff && <aside className="sw-rail">
        <TicketSlaReport userId={actor.id} onOpen={setSelectedId} />
        <section className="sw-panel"><div className="sw-p-head"><h2>{t("alerts")}</h2></div>
          <div className="sw-p-body">
            {alerts.isError && <p role="alert" className="sw-note">{errorText(alerts.error)}</p>}
            {alerts.isSuccess && !alerts.data.length && !staffTickets.length && <p className="sw-meta">{t("noAlerts")}</p>}
            {alerts.data?.map((alert) =>
              <div key={alert.id} className="sw-esc"><p className="sw-esc-t"><button type="button" className="sw-link" onClick={() => setSelectedId(alert.ticket_id)}>#{alert.ticket_id}</button> · {alert.message}</p></div>,
            )}
            {staffTickets.map((ticket) =>
              <div key={`due-${ticket.id}`} className="sw-esc"><p className="sw-esc-t"><button type="button" className="sw-link" onClick={() => setSelectedId(ticket.id)}>#{ticket.id}</button> · {ticket.title}
                {ticket.sla_due_at && <span className="sw-meta"> · {isLate(ticket) ? `${t("pastTarget")} · ` : `${t("dueIn")} `}{dateText(ticket.sla_due_at)}</span>}</p></div>,
            )}
          </div></section>
      </aside>}
      </div>
    </div>
    <Dialog open={creating} onOpenChange={setCreating}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900">
        <DialogTitle>{t("create")}</DialogTitle><DialogDescription>{t("policy")}</DialogDescription>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <label className="block">{t("title")}<Input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="block">{t("ticketType")}<select className={`${selectClass} ml-2`} value={ticketType}
            onChange={(e) => setTicketType(e.target.value as (typeof TICKET_TYPES)[number])}>
            {TICKET_TYPES.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
          <label className="block">{t("description")}<Textarea maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          {create.isError && <p role="alert">{errorText(create.error)}</p>}
          <Button disabled={create.isPending} type="submit">{t("create")}</Button>
        </form>
      </DialogContent>
    </Dialog>
    {selectedId !== null && <TicketDetails key={selectedId} id={selectedId} initial={selected} actor={actor} problems={openProblems}
      onOpen={setSelectedId} onClose={() => setSelectedId(null)} refresh={refresh} />}
  </main>;
}

interface Comment { id: number; author_name: string; body: string; internal: boolean; created_at: string; time_spent_minutes?: number | null }
interface TicketEvent { id: number; kind: string; details: Record<string, unknown>; created_at: string; internal: boolean }

function TicketDetails({ id, initial, actor, problems, onOpen, onClose, refresh }: {
  id: number; initial?: SupportTicket; actor: TicketActor; problems: SupportTicket[]; onOpen: (id: number) => void;
  onClose: () => void; refresh: () => void;
}) {
  const t = useSupportCopy();
  const queryClient = useQueryClient();
  const ticket = useQuery<SupportTicket>({
    queryKey: ["support-detail", id, actor.id],
    initialData: initial,
    queryFn: () => ticketRequest(`/api/tickets/${id}`),
    refetchInterval: 15000,
  });
  const comments = useQuery<Comment[]>({
    queryKey: ["support-comments", id, actor.id],
    queryFn: () => ticketRequest(`/api/tickets/${id}/comments`), refetchInterval: 15000,
  });
  const history = useQuery<TicketEvent[]>({
    queryKey: ["support-history", id, actor.id],
    queryFn: () => ticketRequest(`/api/tickets/${id}/events`), refetchInterval: 15000,
  });
  const staffList = useQuery<{ id: number; username: string; role: string }[]>({
    queryKey: ["support-staff", actor.id],
    enabled: isTicketManager(actor),
    queryFn: () => ticketRequest("/api/tickets/staff"),
  });
  const staff = isTicketStaff(actor);
  const links = useQuery<TicketLinks>({
    queryKey: ["support-links", id, actor.id],
    enabled: staff,
    queryFn: () => ticketRequest(`/api/tickets/${id}/links`),
    refetchInterval: 15000,
  });
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [reason, setReason] = useState("");
  const [pendingReason, setPendingReason] = useState<(typeof PENDING_REASONS)[number]>("customer");
  const [followUpAt, setFollowUpAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [resolutionCode, setResolutionCode] = useState<(typeof RESOLUTION_CODES)[number]>("fixed");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [problemChoice, setProblemChoice] = useState("");
  const mutation = useMutation({
    mutationFn: ({ path, method, input }: { path: string; method: string; input: object }) => ticketRequest(path, method, input),
    onSuccess: () => {
      setReason(""); setResolutionNotes(""); setBody(""); setStatus(""); setPriority(""); setMinutes(""); setProblemChoice("");
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["support-comments", id] });
      void queryClient.invalidateQueries({ queryKey: ["support-history", id] });
    },
  });
  const current = ticket.data;
  const work = current ? canWorkTicket(actor, current) : false;
  const submit = (path: string, method: string, input: object) => mutation.mutate({ path: `/api/tickets/${id}${path}`, method, input });
  const changes = current ? TICKET_STATUSES.filter((next) => !transitionError(actor, current, next)) : [];
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-white text-slate-900">
      <DialogTitle>#{id} {current?.title}</DialogTitle><DialogDescription>{t("policy")}</DialogDescription>
      {[ticket.error, comments.error, history.error, staffList.error, links.error, mutation.error].filter(Boolean).map((error, index) =>
        <p role="alert" key={index}>{errorText(error)}</p>)}
      {current && <>
        <p className="whitespace-pre-wrap break-words">{current.description}</p>
        <p>{t("status")}: {t(current.status)} · {t(current.priority)} · {t(current.ticket_type ?? "incident")}</p>
        {current.ticket_type === "change" && <p>{t("approval")}: {t(current.approval_status === "not-required" ? "pending" : current.approval_status)}</p>}
        {isTicketStaff(actor) && current.escalation_level > 0 && <p>{t("escalationLevel")}: {current.escalation_level}</p>}
        {staff && current.time_spent_minutes > 0 && <p>{t("timeLogged")}: {formatMinutes(current.time_spent_minutes)}</p>}
        {current.resolution_code && <p>{t("resolutionCode")}: {t(current.resolution_code as (typeof RESOLUTION_CODES)[number])} — {current.resolution_notes}</p>}
        {current.follow_up_at && <p>{t("followUp")}: {new Date(current.follow_up_at).toLocaleString()}</p>}
        {current.abandonment_proposed_at && <p className="text-amber-800">{t("abandonment")}</p>}
        {isTicketStaff(actor) && current.assignee_id === null && !TERMINAL_STATUSES.includes(current.status) &&
          <Button disabled={mutation.isPending} onClick={() => submit("/assign", "PUT", { assigneeId: actor.id, reason: t("claim") })}>{t("claim")}</Button>}
        {(changes.length > 0 || isTicketManager(actor)) && <form className="space-y-3 rounded-lg border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit("", "PUT", {
              ...(status ? { status } : {}), ...(priority ? { priority } : {}), reason,
              ...(status === "resolved" ? { resolutionCode, resolutionNotes } : {}),
              ...(status === "pending" ? { pendingReason, followUpAt: new Date(followUpAt).toISOString() } : {}),
            });
          }}>
          <div className="flex flex-wrap gap-3">
            <label>{t("status")}<select className={`${selectClass} ml-2`} value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | "")}>
              <option value="">{t(current.status)}</option>{changes.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select></label>
            {isTicketManager(actor) && !TERMINAL_STATUSES.includes(current.status) && <label>{t("priority")}<select className={`${selectClass} ml-2`} value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">{t(current.priority)}</option>{TICKET_PRIORITIES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select></label>}
          </div>
          {status === "resolved" && <>
            <label className="block">{t("resolutionCode")}<select className={`${selectClass} ml-2`} value={resolutionCode}
              onChange={(e) => setResolutionCode(e.target.value as (typeof RESOLUTION_CODES)[number])}>
              {RESOLUTION_CODES.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
            <label className="block">{t("resolutionNotes")}<Textarea required maxLength={2000} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} /></label>
          </>}
          {status === "pending" && <>
            <label className="block">{t("pendingReason")}<select className={`${selectClass} ml-2`} value={pendingReason}
              onChange={(e) => setPendingReason(e.target.value as (typeof PENDING_REASONS)[number])}>
              {PENDING_REASONS.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
            <label className="block">{t("followUp")}<Input type="datetime-local" required value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} /></label>
          </>}
          <label className="block">{t("reason")}<Textarea required maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <Button type="submit" disabled={mutation.isPending || (!status && !priority)}>{t("save")}</Button>
        </form>}
        {isTicketManager(actor) && !TERMINAL_STATUSES.includes(current.status) && <form className="space-y-3 rounded-lg border p-4"
          onSubmit={(e) => { e.preventDefault(); submit("/assign", "PUT", { assigneeId: assigneeId ? Number(assigneeId) : null, reason }); }}>
          <label>{t("assignee")}<select className={`${selectClass} ml-2`} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">{t("unassigned")}</option>{staffList.data?.map((person) => <option key={person.id} value={person.id}>{person.username} · {person.role}</option>)}
          </select></label>
          <label className="block">{t("reason")}<Input required value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <Button disabled={mutation.isPending} type="submit">{t("assign")}</Button>
        </form>}
        {isTicketManager(actor) && current.ticket_type === "change" && current.approval_status === "pending" && !TERMINAL_STATUSES.includes(current.status) &&
          <div className="flex flex-wrap gap-3 rounded-lg border p-4">
            <label className="block w-full">{t("reason")}<Input required value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <Button disabled={mutation.isPending || !reason.trim()} onClick={() => submit("/approval", "POST", { decision: "approved", reason })}>{t("approve")}</Button>
            <Button variant="outline" disabled={mutation.isPending || !reason.trim()} onClick={() => submit("/approval", "POST", { decision: "rejected", reason })}>{t("reject")}</Button>
          </div>}
        {work && !TERMINAL_STATUSES.includes(current.status) && <Button variant="outline" disabled={mutation.isPending || !reason.trim()}
          onClick={() => submit("/escalate", "POST", { reason })}>{t("escalate")}</Button>}
        {staff && current.ticket_type !== "problem" && <ProblemLink ticket={current} link={links.data?.problem ?? null} problems={problems}
          canEdit={work && !TERMINAL_STATUSES.includes(current.status)} busy={mutation.isPending} choice={problemChoice}
          onChoice={setProblemChoice} onOpen={onOpen} onChange={(problemId) => submit("/problem", "PUT", { problemId })} />}
        {staff && current.ticket_type === "problem" && <section className="space-y-2 rounded-lg border p-4">
          <h2 className="font-bold">{t("linkedTickets")}</h2>
          {links.data && (links.data.related.length === 0 ? <p className="text-sm">{t("noLinkedTickets")}</p> :
            <ul className="space-y-1 text-sm">{links.data.related.map((item) => <li key={item.id} className="break-words">
              <button className="underline" onClick={() => onOpen(item.id)}>#{item.id}</button> · {item.title} · {t(item.status)} · {t(item.priority)}
            </li>)}</ul>)}
        </section>}
        <section><h2 className="font-bold">{t("comments")}</h2>
          {comments.data?.map((comment) => <article key={comment.id} className={`my-3 rounded-lg border p-3 ${comment.internal ? "border-amber-400 bg-amber-50" : "bg-slate-50"}`}>
            <p className="text-xs">{comment.author_name} · {new Date(comment.created_at).toLocaleString()} · {t(comment.internal ? "note" : "reply")}
              {staff && comment.time_spent_minutes ? ` · ${formatMinutes(comment.time_spent_minutes)}` : ""}</p>
            <p className="mt-2 whitespace-pre-wrap break-words">{comment.body}</p>
          </article>)}
          {(!isTicketStaff(actor) || work) && (!TERMINAL_STATUSES.includes(current.status) || (current.status === "resolved" && !isTicketStaff(actor))) && <form className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); submit("/comments", "POST", { body, internal, ...(staff && minutes ? { timeSpentMinutes: Number(minutes) } : {}) }); }}>
            <label className="block">{t(internal ? "note" : "reply")}<Textarea required maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} /></label>
            {isTicketStaff(actor) && <label className="flex items-center gap-2"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />{t("note")}</label>}
            {staff && <label className="block">{t("timeSpent")}
              <Input type="number" inputMode="numeric" min={1} max={MAX_TIME_ENTRY_MINUTES} step={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>}
            <Button disabled={mutation.isPending} type="submit">{t("send")}</Button>
          </form>}
        </section>
        <section><h2 className="font-bold">{t("history")}</h2><ol className="mt-2 space-y-2 text-xs">
          {history.data?.map((entry) => <li key={entry.id} className="break-words border-b pb-2">
            {new Date(entry.created_at).toLocaleString()} · {entry.kind} {entry.internal && `· ${t("note")}`}
            <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(entry.details, null, 2)}</pre>
          </li>)}
        </ol></section>
      </>}
    </DialogContent>
  </Dialog>;
}

function ProblemLink({ ticket, link, problems, canEdit, busy, choice, onChoice, onOpen, onChange }: {
  ticket: SupportTicket; link: TicketLink | null; problems: SupportTicket[]; canEdit: boolean; busy: boolean; choice: string;
  onChoice: (value: string) => void; onOpen: (id: number) => void; onChange: (problemId: number | null) => void;
}) {
  const t = useSupportCopy();
  const linkedId = ticket.problem_id || null;
  // The links query can trail a re-link by one refetch, so a title is shown only while it matches the current problem.
  const linked = link && link.id === linkedId ? link : null;
  const choices = problems.filter((problem) => problem.id !== linkedId);
  const chosen = choices.some((problem) => String(problem.id) === choice);
  return <section className="space-y-3 rounded-lg border p-4">
    <h2 className="font-bold">{t("linkedProblem")}</h2>
    {linked
      ? <p className="break-words"><button className="underline" onClick={() => onOpen(linked.id)}>#{linked.id}</button> · {linked.title} · {t(linked.status)}</p>
      : linkedId ? <p>#{linkedId}</p> : <p>{t("noLinkedProblem")}</p>}
    {canEdit && (choices.length === 0 ? <p className="text-sm">{t("noOpenProblems")}</p> :
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label={t("chooseProblem")} className={selectClass} value={chosen ? choice : ""} onChange={(e) => onChoice(e.target.value)}>
          <option value="">{t("chooseProblem")}</option>
          {choices.map((problem) => <option key={problem.id} value={problem.id}>#{problem.id} · {problem.title}</option>)}
        </select>
        <Button disabled={busy || !chosen} onClick={() => onChange(Number(choice))}>{t("linkProblem")}</Button>
      </div>)}
    {canEdit && linkedId && <Button variant="outline" disabled={busy} onClick={() => onChange(null)}>{t("unlinkProblem")}</Button>}
  </section>;
}

export default Tickets;

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { errorText, ticketRequest } from "@/lib/support-api";
import { useOwnerAccess } from "@/hooks/use-owner-access";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { TicketSlaReport } from "@/components/TicketSlaReport";
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog";
import { TicketDetails } from "@/components/tickets/TicketDetails";
import { TicketRow } from "@/components/tickets/TicketRow";
import { ICONS, Icon, Skeleton, SlaChip, dateText, type ListTicket } from "@/components/tickets/ticket-ui";
import { isTicketLate, matchesQuickView, QUICK_VIEWS, type QuickView } from "@/lib/ticket-view";
import {
  isTicketStaff, TERMINAL_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES, isSlaPaused,
  type TicketActor,
} from "@shared/ticket-policy";

import "./tickets-workspace.css";

const SORTS = ["target", "newest", "openFirst"] as const;
type Sort = (typeof SORTS)[number];
const VIEW_KEY = { all: "viewAll", mine: "mine", unassigned: "unassigned", atRisk: "viewAtRisk", late: "pastTarget" } as const;

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
  const [view, setView] = useState<QuickView>("all");
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get("ticket");
    return value && /^[1-9]\d{0,8}$/.test(value) ? Number(value) : null;
  });
  const [creating, setCreating] = useState(false);
  const tickets = useQuery<ListTicket[]>({
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
  const claim = useMutation({
    mutationFn: (id: number) => ticketRequest(`/api/tickets/${id}/assign`, "PUT", { assigneeId: actor.id, reason: t("claim") }),
    onSuccess: refresh,
  });

  const now = Date.now();
  const all = tickets.data ?? [];
  const live = all.filter((ticket) => !TERMINAL_STATUSES.includes(ticket.status));
  const dueTime = (ticket: ListTicket) =>
    ticket.sla_due_at && !isSlaPaused(ticket) ? new Date(ticket.sla_due_at).getTime() : Number.MAX_SAFE_INTEGER;
  const visible = useMemo(() => {
    const needle = search.toLowerCase();
    return all.filter((ticket) =>
      matchesQuickView(view, ticket, actor.id, now) &&
      (status === "all" || ticket.status === status) &&
      (priorityFilter === "all" || ticket.priority === priorityFilter) &&
      `${ticket.id} ${ticket.title} ${ticket.description || ""}`.toLowerCase().includes(needle),
    ).sort((a, b) => {
      const aDone = TERMINAL_STATUSES.includes(a.status) ? 1 : 0;
      const bDone = TERMINAL_STATUSES.includes(b.status) ? 1 : 0;
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id;
      if (aDone !== bDone) return aDone - bDone;
      return sort === "target" ? dueTime(a) - dueTime(b) || a.id - b.id : b.id - a.id;
    });
    // `now` changes every render and would defeat the memo; the list is re-evaluated whenever the data refetches (every 15s).
  }, [all, view, status, priorityFilter, search, sort, actor.id]);

  const counts = useMemo(() => Object.fromEntries(
    QUICK_VIEWS.map((key) => [key, all.filter((ticket) => matchesQuickView(key, ticket, actor.id, Date.now())).length]),
  ) as Record<QuickView, number>, [all, actor.id]);
  const kpi = {
    open: live.length,
    unassigned: live.filter((ticket) => !ticket.assignee_id).length,
    late: live.filter((ticket) => isTicketLate(ticket, now)).length,
    closed: all.length - live.length,
  };
  const selected = all.find((ticket) => ticket.id === selectedId);
  // Staff can only link to problems they can read, which is exactly what their own list contains.
  const openProblems = staff ? live.filter((ticket) => ticket.ticket_type === "problem") : [];
  const alerted = new Set((alerts.data ?? []).map((alert) => alert.ticket_id));
  const staffTickets = [...live].filter((ticket) => !alerted.has(ticket.id)).sort((a, b) => dueTime(a) - dueTime(b) || a.id - b.id).slice(0, 5);
  const filtered = view !== "all" || status !== "all" || priorityFilter !== "all" || search !== "";
  const clearFilters = () => { setView("all"); setStatus("all"); setPriorityFilter("all"); setSearch(""); };

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
          ["open", t("open"), kpi.open, t("kpiOpenNote"), "", "all"],
          ["unassigned", t("unassigned"), kpi.unassigned, t("kpiUnassignedNote"), kpi.unassigned ? "is-warn" : "", "unassigned"],
          ["late", t("pastTarget"), kpi.late, t("kpiLateNote"), kpi.late ? "is-alert" : "is-ok", "late"],
          ["closed", t("closed"), kpi.closed, t("kpiClosedNote"), "", "all"],
        ] as const).map(([key, label, value, note, tone, target]) =>
          <button type="button" key={key} className={`sw-kpi ${tone}`} onClick={() => { setView(target); if (key === "closed") setStatus("closed"); else setStatus("all"); }}>
            <span className="sw-kpi-k">{label}</span><span className="sw-kpi-v">{tickets.isPending ? "–" : value}</span><span className="sw-kpi-n">{note}</span>
          </button>)}
      </div>}

      <div className="sw-command">
        <div className="sw-toolbar">
          <div className={`sw-search${search ? " has" : ""}`}>
            <Icon d={ICONS.search} />
            <input type="search" aria-label={t("search")} placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" className="sw-clr" aria-label={t("clearSearch")} onClick={() => setSearch("")}><Icon d={ICONS.clear} /></button>
          </div>
          <div className="sw-selwrap">
            <select aria-label={t("status")} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">{t("status")}: {t("all")}</option>{TICKET_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select><Icon d={ICONS.chevron} />
          </div>
          <div className="sw-selwrap">
            <select aria-label={t("priority")} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">{t("priority")}: {t("all")}</option>{TICKET_PRIORITIES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select><Icon d={ICONS.chevron} />
          </div>
          <div className="sw-selwrap">
            <select aria-label={t("sort")} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="target">{t("sortTarget")}</option><option value="newest">{t("sortNewest")}</option><option value="openFirst">{t("sortOpenFirst")}</option>
            </select><Icon d={ICONS.chevron} />
          </div>
        </div>
        <div className="sw-views-row">
          {staff && <div className="sw-views" role="group" aria-label={t("status")}>
            {QUICK_VIEWS.map((key) => <button key={key} type="button" aria-pressed={view === key} className={`sw-view${view === key ? " is-on" : ""}`}
              onClick={() => setView(key)}>{t(VIEW_KEY[key])}<span>{counts[key]}</span></button>)}
          </div>}
          <span className="sw-count" aria-live="polite"><b>{visible.length}</b> {t("of")} {all.length} {t("ticketCount")}</span>
          {filtered && <button type="button" className="sw-link" onClick={clearFilters}>{t("clearFilters")}</button>}
        </div>
      </div>

      <div className={`sw-layout${staff ? "" : " is-solo"}`}>
        <div className="sw-main">
          {tickets.isPending && <Skeleton rows={5} />}
          {tickets.isError && <p role="alert" className="sw-note">{errorText(tickets.error)} <button type="button" className="sw-btn" onClick={() => void tickets.refetch()}>{t("retry")}</button></p>}
          {claim.isError && <p role="alert" className="sw-note">{errorText(claim.error)}</p>}
          {tickets.isSuccess && !visible.length && <div className="sw-empty">
            <b>{filtered ? t("noMatches") : t("empty")}</b>
            {filtered ? <button type="button" className="sw-btn" onClick={clearFilters}>{t("clearFilters")}</button>
              : <><p>{t("emptyHint")}</p><button type="button" className="sw-btn sw-btn-amber" onClick={() => setCreating(true)}><Icon d={ICONS.plus} />{t("create")}</button></>}
          </div>}
          <div className="sw-rows">
            {visible.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} actorId={actor.id} staff={staff} now={now} t={t}
              alert={alerted.has(ticket.id)} onOpen={setSelectedId} onClaim={staff ? (id) => claim.mutate(id) : undefined} />)}
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
                  {ticket.sla_due_at && <span className="sw-meta"> · <SlaChip ticket={ticket} now={now} t={t} /><span className="sr-only">{dateText(ticket.sla_due_at)}</span></span>}</p></div>,
              )}
            </div></section>
        </aside>}
      </div>
    </div>

    <CreateTicketDialog open={creating} userId={actor.id} existing={all} onClose={() => setCreating(false)}
      onOpenExisting={setSelectedId}
      onCreated={(ticket) => { setCreating(false); setSelectedId(ticket.id); refresh(); }} />
    {selectedId !== null && <TicketDetails key={selectedId} id={selectedId} initial={selected} actor={actor} problems={openProblems}
      onOpen={setSelectedId} onClose={() => setSelectedId(null)} refresh={refresh} />}
  </main>;
}

export default Tickets;

import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { ticketRequest } from "@/lib/support-api";
import { useOwnerAccess } from "@/hooks/use-owner-access";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  canWorkTicket, isTicketManager, isTicketStaff, PENDING_REASONS, TERMINAL_STATUSES,
  TICKET_PRIORITIES, TICKET_STATUSES, transitionError, type SupportTicket, type TicketActor, type TicketStatus,
} from "@shared/ticket-policy";

const selectClass = "min-h-11 rounded-md border border-slate-400 bg-white px-3 text-slate-900 max-w-full";
const errorText = (error: unknown) => error instanceof Error ? error.message : "Support request failed";

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
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get("ticket");
    return value && /^[1-9]\d{0,8}$/.test(value) ? Number(value) : null;
  });
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
  };
  const create = useMutation({
    mutationFn: () => ticketRequest<SupportTicket>("/api/tickets", "POST", { title, description }),
    onSuccess: (ticket) => { setCreating(false); setTitle(""); setDescription(""); setSelectedId(ticket.id); refresh(); },
  });
  const selected = tickets.data?.find((ticket) => ticket.id === selectedId);
  const visible = tickets.data?.filter((ticket) =>
    (status === "all" || ticket.status === status) &&
    (priorityFilter === "all" || ticket.priority === priorityFilter) &&
    `${ticket.id} ${ticket.title} ${ticket.description || ""}`.toLowerCase().includes(search.toLowerCase()),
  ) || [];

  return <main className="min-h-screen bg-slate-50 px-4 pb-24 pt-24 text-slate-900" data-testid="ticket-workspace">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#0b1f3a] p-6 text-white">
        <div><h1 className="text-2xl font-bold">{staff ? t("workspace") : t("tickets")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-200">{staff ? t("scope") : t("policy")}</p></div>
        <div className="flex flex-wrap gap-2">
          {actor.owner && <Link href="/geo-admin/dashboard"><Button variant="secondary">{t("ownerPanel")}</Button></Link>}
          <Button variant="secondary" onClick={refresh}>{t("refresh")}</Button>
          <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => setCreating(true)}>{t("create")}</Button>
        </div>
      </header>
      <div className="flex flex-wrap gap-3">
        <Input aria-label={t("search")} placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-white" />
        <select className={selectClass} aria-label={t("status")} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">{t("all")}</option>{TICKET_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
        </select>
        <select className={selectClass} aria-label={t("priority")} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">{t("all")}</option>{TICKET_PRIORITIES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
        </select>
      </div>
      {tickets.isPending && <p>{t("loading")}</p>}
      {tickets.isError && <p role="alert">{errorText(tickets.error)} <Button onClick={() => void tickets.refetch()}>{t("retry")}</Button></p>}
      {tickets.isSuccess && !visible.length && <p>{t("empty")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((ticket) => <button key={ticket.id} onClick={() => setSelectedId(ticket.id)}
          className="min-w-0 rounded-xl border border-slate-300 bg-white p-5 text-left shadow-sm hover:border-amber-500">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span>#{ticket.id} · {t(ticket.status)}</span><span>{t(ticket.priority)}</span>
          </div>
          <h2 className="mt-2 break-words font-bold">{ticket.title}</h2>
          <p className="mt-2 break-words text-sm text-slate-600">{ticket.description?.slice(0, 180)}</p>
          <p className="mt-3 text-sm">{t("assignee")}: {ticket.assignee_id || t("unassigned")}</p>
          {ticket.abandonment_proposed_at && staff && <p className="mt-2 font-semibold text-amber-800">{t("abandonment")}</p>}
          {ticket.sla_due_at && <p className={`mt-2 text-xs ${ticket.sla_breached ? "text-red-700" : "text-slate-600"}`}>{t("target")}: {new Date(ticket.sla_due_at).toLocaleString()}</p>}
        </button>)}
      </div>
      {staff && <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">{t("alerts")}</h2>
        {alerts.isError && <p role="alert">{errorText(alerts.error)}</p>}
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">{alerts.data?.map((alert) =>
          <li key={alert.id} className="border-b pb-2 text-sm"><button className="underline" onClick={() => setSelectedId(alert.ticket_id)}>#{alert.ticket_id}</button> · {alert.message}</li>,
        )}</ul></section>}
    </div>
    <Dialog open={creating} onOpenChange={setCreating}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900">
        <DialogTitle>{t("create")}</DialogTitle><DialogDescription>{t("policy")}</DialogDescription>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <label className="block">{t("title")}<Input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="block">{t("description")}<Textarea maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          {create.isError && <p role="alert">{errorText(create.error)}</p>}
          <Button disabled={create.isPending} type="submit">{t("create")}</Button>
        </form>
      </DialogContent>
    </Dialog>
    {selectedId !== null && <TicketDetails key={selectedId} id={selectedId} initial={selected} actor={actor} onClose={() => setSelectedId(null)} refresh={refresh} />}
  </main>;
}

interface Comment { id: number; author_name: string; body: string; internal: boolean; created_at: string }
interface TicketEvent { id: number; kind: string; details: Record<string, unknown>; created_at: string; internal: boolean }

function TicketDetails({ id, initial, actor, onClose, refresh }: {
  id: number; initial?: SupportTicket; actor: TicketActor; onClose: () => void; refresh: () => void;
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
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [reason, setReason] = useState("");
  const [pendingReason, setPendingReason] = useState<(typeof PENDING_REASONS)[number]>("customer");
  const [followUpAt, setFollowUpAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const mutation = useMutation({
    mutationFn: ({ path, method, input }: { path: string; method: string; input: object }) => ticketRequest(path, method, input),
    onSuccess: () => {
      setReason(""); setBody(""); setStatus(""); setPriority("");
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
      {[ticket.error, comments.error, history.error, staffList.error, mutation.error].filter(Boolean).map((error, index) =>
        <p role="alert" key={index}>{errorText(error)}</p>)}
      {current && <>
        <p className="whitespace-pre-wrap break-words">{current.description}</p>
        <p>{t("status")}: {t(current.status)} · {t(current.priority)}</p>
        {current.follow_up_at && <p>{t("followUp")}: {new Date(current.follow_up_at).toLocaleString()}</p>}
        {current.abandonment_proposed_at && <p className="text-amber-800">{t("abandonment")}</p>}
        {isTicketStaff(actor) && current.assignee_id === null && !TERMINAL_STATUSES.includes(current.status) &&
          <Button disabled={mutation.isPending} onClick={() => submit("/assign", "PUT", { assigneeId: actor.id, reason: t("claim") })}>{t("claim")}</Button>}
        {(changes.length > 0 || isTicketManager(actor)) && <form className="space-y-3 rounded-lg border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit("", "PUT", {
              ...(status ? { status } : {}), ...(priority ? { priority } : {}), reason,
              ...(status === "pending" ? { pendingReason, followUpAt: new Date(followUpAt).toISOString() } : {}),
            });
          }}>
          <div className="flex flex-wrap gap-3">
            <label>{t("status")}<select className={`${selectClass} ml-2`} value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | "")}>
              <option value="">{t(current.status)}</option>{changes.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select></label>
            {isTicketManager(actor) && <label>{t("priority")}<select className={`${selectClass} ml-2`} value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">{t(current.priority)}</option>{TICKET_PRIORITIES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select></label>}
          </div>
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
        {work && <Button variant="outline" disabled={mutation.isPending || !reason.trim()}
          onClick={() => submit("/escalate", "POST", { reason })}>{t("escalate")}</Button>}
        <section><h2 className="font-bold">{t("comments")}</h2>
          {comments.data?.map((comment) => <article key={comment.id} className={`my-3 rounded-lg border p-3 ${comment.internal ? "border-amber-400 bg-amber-50" : "bg-slate-50"}`}>
            <p className="text-xs">{comment.author_name} · {new Date(comment.created_at).toLocaleString()} · {t(comment.internal ? "note" : "reply")}</p>
            <p className="mt-2 whitespace-pre-wrap break-words">{comment.body}</p>
          </article>)}
          {(!isTicketStaff(actor) || work) && <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit("/comments", "POST", { body, internal }); }}>
            <label className="block">{t(internal ? "note" : "reply")}<Textarea required maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} /></label>
            {isTicketStaff(actor) && <label className="flex items-center gap-2"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />{t("note")}</label>}
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

export default Tickets;

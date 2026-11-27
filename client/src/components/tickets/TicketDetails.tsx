import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { errorText, ticketRequest } from "@/lib/support-api";
import { buildTimeline, type RawComment, type RawEvent } from "@/lib/ticket-view";
import {
  canWorkTicket, formatMinutes, isTicketManager, isTicketStaff, MAX_TIME_ENTRY_MINUTES, PENDING_REASONS, RESOLUTION_CODES,
  TERMINAL_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES, transitionError,
  type SupportTicket, type TicketActor, type TicketLinks, type TicketStatus,
} from "@shared/ticket-policy";
import { ProblemLink } from "./ProblemLink";
import { ProgressTracker } from "./ProgressTracker";
import { Timeline } from "./Timeline";
import { ICONS, Icon, SlaChip, Tag, TypeIcon, dateText, priorityTone, type ListTicket } from "./ticket-ui";

interface Props {
  id: number;
  initial?: ListTicket;
  actor: TicketActor;
  problems: SupportTicket[];
  onOpen: (id: number) => void;
  onClose: () => void;
  refresh: () => void;
}

const CANNED = [["cannedAck", "cannedAckLabel"], ["cannedInfo", "cannedInfoLabel"], ["cannedDone", "cannedDoneLabel"]] as const;

export function TicketDetails({ id, initial, actor, problems, onOpen, onClose, refresh }: Props) {
  const t = useSupportCopy();
  const queryClient = useQueryClient();
  const staff = isTicketStaff(actor);
  const manager = isTicketManager(actor);
  const ticket = useQuery<SupportTicket>({
    queryKey: ["support-detail", id, actor.id],
    initialData: initial,
    queryFn: () => ticketRequest(`/api/tickets/${id}`),
    refetchInterval: 15000,
  });
  const comments = useQuery<RawComment[]>({
    queryKey: ["support-comments", id, actor.id],
    queryFn: () => ticketRequest(`/api/tickets/${id}/comments`),
    refetchInterval: 15000,
  });
  const history = useQuery<RawEvent[]>({
    queryKey: ["support-history", id, actor.id],
    queryFn: () => ticketRequest(`/api/tickets/${id}/events`),
    refetchInterval: 15000,
  });
  const staffList = useQuery<{ id: number; username: string; role: string }[]>({
    queryKey: ["support-staff", actor.id],
    enabled: manager,
    queryFn: () => ticketRequest("/api/tickets/staff"),
  });
  const links = useQuery<TicketLinks>({
    queryKey: ["support-links", id, actor.id],
    enabled: staff,
    queryFn: () => ticketRequest(`/api/tickets/${id}/links`),
    refetchInterval: 15000,
  });
  const [manageOpen, setManageOpen] = useState(false);
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
  const closed = current ? TERMINAL_STATUSES.includes(current.status) : false;
  const submit = (path: string, method: string, input: object) => mutation.mutate({ path: `/api/tickets/${id}${path}`, method, input });
  const changes = current ? TICKET_STATUSES.filter((next) => !transitionError(actor, current, next)) : [];
  const timeline = useMemo(() => buildTimeline(comments.data ?? [], history.data ?? []), [comments.data, history.data]);
  const assigneeName = current?.assignee_id
    ? current.assignee_id === actor.id ? t("you")
      : initial?.assignee_name ?? staffList.data?.find((person) => person.id === current.assignee_id)?.username ?? `#${current.assignee_id}`
    : t("unassigned");
  const now = Date.now();
  const canReply = (!staff || work) && (!closed || (current?.status === "resolved" && !staff));
  const canClaim = staff && !!current && current.assignee_id === null && !closed;
  const canStart = staff && work && !!current && !closed && current.status !== "in-progress" && changes.includes("in-progress");
  const canResolve = staff && work && changes.includes("resolved");
  const canPend = staff && work && changes.includes("pending");
  const openManage = (next: TicketStatus) => { setStatus(next); setManageOpen(true); };
  const errors = [ticket.error, comments.error, history.error, staffList.error, links.error, mutation.error].filter(Boolean);

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="sw-dialog max-h-[92vh] max-w-4xl overflow-y-auto p-0">
      <div className="sw-scope sw-detail">
        <header className="sw-d-head">
          <div className="sw-row-top">
            <TypeIcon type={current?.ticket_type ?? "incident"} />
            <span className="sw-tid">#{id}</span>
            {current && <>
              <Tag tone={closed ? "sw-tag-closed" : "sw-tag-open"}>{t(current.status)}</Tag>
              <Tag tone={priorityTone(current.priority)}>{t(current.priority)}</Tag>
              <Tag tone="sw-tag-teal">{t(current.ticket_type ?? "incident")}</Tag>
              <span className="sw-spacer"><SlaChip ticket={current} now={now} t={t} /></span>
            </>}
          </div>
          <DialogTitle className="sw-d-title">{current?.title}</DialogTitle>
          <DialogDescription className="sr-only">{t("policy")}</DialogDescription>
          {current && <ProgressTracker ticket={current} t={t} />}
        </header>

        {errors.map((error, index) => <p role="alert" key={index} className="sw-error">{errorText(error)}</p>)}

        {current && <div className="sw-d-grid">
          <div className="sw-d-main">
            {current.description && <section className="sw-block"><p className="sw-pre">{current.description}</p></section>}
            {current.abandonment_proposed_at && <p className="sw-warn">{t("abandonment")}</p>}
            {current.resolution_code && <section className="sw-block sw-resolution">
              <h3>{t("resolutionCode")}: {t(current.resolution_code as (typeof RESOLUTION_CODES)[number])}</h3>
              {current.resolution_notes && <p className="sw-pre">{current.resolution_notes}</p>}
            </section>}

            {staff && !closed && (canClaim || canStart || canResolve || canPend) && <div className="sw-next" role="group" aria-label={t("nextStep")}>
              <span className="sw-next-label">{t("nextStep")}</span>
              {canClaim && <button type="button" className="sw-btn sw-btn-amber" disabled={mutation.isPending}
                onClick={() => submit("/assign", "PUT", { assigneeId: actor.id, reason: t("claim") })}><Icon d={ICONS.user} />{t("claim")}</button>}
              {canStart && <button type="button" className="sw-btn sw-btn-amber" disabled={mutation.isPending}
                onClick={() => submit("", "PUT", { status: "in-progress", reason: t("startWorkReason") })}><Icon d={ICONS.arrow} />{t("startWork")}</button>}
              {canPend && <button type="button" className="sw-btn" onClick={() => openManage("pending")}><Icon d={ICONS.pause} />{t("pending")}</button>}
              {canResolve && <button type="button" className="sw-btn" onClick={() => openManage("resolved")}><Icon d={ICONS.check} />{t("resolved")}</button>}
            </div>}

            <section className="sw-block">
              <h3>{t("activity")}</h3>
              <Timeline items={timeline} staff={staff} t={t} />
            </section>

            {canReply && <form className="sw-composer" onSubmit={(e) => {
              e.preventDefault();
              submit("/comments", "POST", { body, internal, ...(staff && minutes ? { timeSpentMinutes: Number(minutes) } : {}) });
            }}>
              {staff && <div className="sw-seg" role="radiogroup" aria-label={t("comments")}>
                <button type="button" role="radio" aria-checked={!internal} className={!internal ? "is-on" : ""} onClick={() => setInternal(false)}>{t("reply")}</button>
                <button type="button" role="radio" aria-checked={internal} className={internal ? "is-on" : ""} onClick={() => setInternal(true)}><Icon d={ICONS.lock} />{t("note")}</button>
              </div>}
              {staff && !internal && <div className="sw-chips" aria-label={t("quickReplies")}>
                {CANNED.map(([text, label]) => <button key={text} type="button" className="sw-chip" onClick={() => setBody(t(text))}>{t(label)}</button>)}
              </div>}
              <textarea required maxLength={5000} rows={3} className="sw-input" value={body} onChange={(e) => setBody(e.target.value)}
                placeholder={internal ? t("writeNote") : t("writeReply")} aria-label={internal ? t("note") : t("reply")} />
              <p className="sw-meta">{staff ? (internal ? t("staffOnly") : t("requesterSees")) : ""}</p>
              <div className="sw-composer-foot">
                {staff && <label className="sw-time">{t("timeSpent")}
                  <input type="number" inputMode="numeric" min={1} max={MAX_TIME_ENTRY_MINUTES} step={1} className="sw-input" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>}
                <button type="submit" className="sw-btn sw-btn-amber" disabled={mutation.isPending || !body.trim()}>{t("send")}</button>
              </div>
            </form>}
          </div>

          <aside className="sw-d-side">
            <section className="sw-block">
              <h3>{t("facts")}</h3>
              <dl className="sw-facts">
                <div><dt>{t("assignee")}</dt><dd>{assigneeName}</dd></div>
                {current.reporter && <div><dt>{t("reporter")}</dt><dd>{current.reporter}</dd></div>}
                <div><dt>{t("category")}</dt><dd>{current.category}</dd></div>
                {current.team && <div><dt>{t("team")}</dt><dd>{current.team}</dd></div>}
                <div><dt>{t("createdOn")}</dt><dd>{dateText(current.created_at)}</dd></div>
                <div><dt>{t("updatedOn")}</dt><dd>{dateText(current.updated_at)}</dd></div>
                {current.follow_up_at && <div><dt>{t("followUp")}</dt><dd>{dateText(current.follow_up_at)}</dd></div>}
                {current.ticket_type === "change" && <div><dt>{t("approval")}</dt><dd>{t(current.approval_status === "not-required" ? "pending" : current.approval_status)}</dd></div>}
                {staff && current.escalation_level > 0 && <div><dt>{t("escalationLevel")}</dt><dd>{current.escalation_level}</dd></div>}
                {staff && current.time_spent_minutes > 0 && <div><dt>{t("timeLogged")}</dt><dd>{formatMinutes(current.time_spent_minutes)}</dd></div>}
              </dl>
            </section>

            {staff && current.ticket_type !== "problem" && <ProblemLink ticket={current} link={links.data?.problem ?? null} problems={problems}
              canEdit={work && !closed} busy={mutation.isPending} choice={problemChoice} onChoice={setProblemChoice} onOpen={onOpen}
              onChange={(problemId) => submit("/problem", "PUT", { problemId })} />}
            {staff && current.ticket_type === "problem" && <section className="sw-block">
              <h3>{t("linkedTickets")}</h3>
              {links.data && (links.data.related.length === 0 ? <p className="sw-meta">{t("noLinkedTickets")}</p> :
                <ul className="sw-list">{links.data.related.map((item) => <li key={item.id}>
                  <button type="button" className="sw-link" onClick={() => onOpen(item.id)}>#{item.id}</button> · {item.title} · {t(item.status)} · {t(item.priority)}
                </li>)}</ul>)}
            </section>}

            {(changes.length > 0 || manager) && <details className="sw-block sw-manage" open={manageOpen} onToggle={(e) => setManageOpen(e.currentTarget.open)}>
              <summary>{t("manage")}</summary>
              <label className="sw-field"><span>{t("reason")}</span>
                <textarea maxLength={2000} rows={2} className="sw-input" value={reason} onChange={(e) => setReason(e.target.value)} /></label>

              {changes.length > 0 && <form className="sw-sub" onSubmit={(e) => {
                e.preventDefault();
                submit("", "PUT", {
                  ...(status ? { status } : {}), ...(priority ? { priority } : {}), reason,
                  ...(status === "resolved" ? { resolutionCode, resolutionNotes } : {}),
                  ...(status === "pending" ? { pendingReason, followUpAt: new Date(followUpAt).toISOString() } : {}),
                });
              }}>
                <label className="sw-field"><span>{t("status")}</span>
                  <select className="sw-input" value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | "")}>
                    <option value="">{t(current.status)}</option>{changes.map((value) => <option key={value} value={value}>{t(value)}</option>)}
                  </select></label>
                {manager && !closed && <label className="sw-field"><span>{t("priority")}</span>
                  <select className="sw-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="">{t(current.priority)}</option>{TICKET_PRIORITIES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
                  </select></label>}
                {status === "resolved" && <>
                  <label className="sw-field"><span>{t("resolutionCode")}</span>
                    <select className="sw-input" value={resolutionCode} onChange={(e) => setResolutionCode(e.target.value as (typeof RESOLUTION_CODES)[number])}>
                      {RESOLUTION_CODES.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
                  <label className="sw-field"><span>{t("resolutionNotes")}</span>
                    <textarea required maxLength={2000} rows={2} className="sw-input" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} /></label>
                </>}
                {status === "pending" && <>
                  <label className="sw-field"><span>{t("pendingReason")}</span>
                    <select className="sw-input" value={pendingReason} onChange={(e) => setPendingReason(e.target.value as (typeof PENDING_REASONS)[number])}>
                      {PENDING_REASONS.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label>
                  <label className="sw-field"><span>{t("followUp")}</span>
                    <input type="datetime-local" required className="sw-input" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} /></label>
                </>}
                <button type="submit" className="sw-btn sw-btn-amber" disabled={mutation.isPending || !reason.trim() || (!status && !priority)}>{t("save")}</button>
              </form>}

              {manager && !closed && <div className="sw-sub">
                <label className="sw-field"><span>{t("assignee")}</span>
                  <select className="sw-input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                    <option value="">{t("unassigned")}</option>
                    {staffList.data?.map((person) => <option key={person.id} value={person.id}>{person.username} · {person.role}</option>)}
                  </select></label>
                <button type="button" className="sw-btn" disabled={mutation.isPending || !reason.trim()}
                  onClick={() => submit("/assign", "PUT", { assigneeId: assigneeId ? Number(assigneeId) : null, reason })}>{t("assign")}</button>
              </div>}

              {manager && current.ticket_type === "change" && current.approval_status === "pending" && !closed && <div className="sw-sub sw-inline">
                <button type="button" className="sw-btn sw-btn-amber" disabled={mutation.isPending || !reason.trim()}
                  onClick={() => submit("/approval", "POST", { decision: "approved", reason })}>{t("approve")}</button>
                <button type="button" className="sw-btn" disabled={mutation.isPending || !reason.trim()}
                  onClick={() => submit("/approval", "POST", { decision: "rejected", reason })}>{t("reject")}</button>
              </div>}

              {work && !closed && <button type="button" className="sw-btn" disabled={mutation.isPending || !reason.trim()}
                onClick={() => submit("/escalate", "POST", { reason })}><Icon d={ICONS.alert} />{t("escalate")}</button>}
            </details>}
          </aside>
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}

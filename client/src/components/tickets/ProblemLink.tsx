import { useSupportCopy } from "@/hooks/use-support-copy";
import type { SupportTicket, TicketLink } from "@shared/ticket-policy";

interface Props {
  ticket: SupportTicket;
  link: TicketLink | null;
  problems: SupportTicket[];
  canEdit: boolean;
  busy: boolean;
  choice: string;
  onChoice: (value: string) => void;
  onOpen: (id: number) => void;
  onChange: (problemId: number | null) => void;
}

export function ProblemLink({ ticket, link, problems, canEdit, busy, choice, onChoice, onOpen, onChange }: Props) {
  const t = useSupportCopy();
  const linkedId = ticket.problem_id || null;
  // The links query can trail a re-link by one refetch, so a title is shown only while it matches the current problem.
  const linked = link && link.id === linkedId ? link : null;
  const choices = problems.filter((problem) => problem.id !== linkedId);
  const chosen = choices.some((problem) => String(problem.id) === choice);
  return <section className="sw-block">
    <h3>{t("linkedProblem")}</h3>
    {linked
      ? <p className="sw-pre"><button type="button" className="sw-link" onClick={() => onOpen(linked.id)}>#{linked.id}</button> · {linked.title} · {t(linked.status)}</p>
      : linkedId ? <p>#{linkedId}</p> : <p className="sw-meta">{t("noLinkedProblem")}</p>}
    {canEdit && (choices.length === 0 ? <p className="sw-meta">{t("noOpenProblems")}</p> :
      <div className="sw-inline">
        <select aria-label={t("chooseProblem")} className="sw-input" value={chosen ? choice : ""} onChange={(e) => onChoice(e.target.value)}>
          <option value="">{t("chooseProblem")}</option>
          {choices.map((problem) => <option key={problem.id} value={problem.id}>#{problem.id} · {problem.title}</option>)}
        </select>
        <button type="button" className="sw-btn" disabled={busy || !chosen} onClick={() => onChange(Number(choice))}>{t("linkProblem")}</button>
      </div>)}
    {canEdit && linkedId && <button type="button" className="sw-btn" disabled={busy} onClick={() => onChange(null)}>{t("unlinkProblem")}</button>}
  </section>;
}

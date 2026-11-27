import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { errorText, ticketRequest } from "@/lib/support-api";
import {
  CATEGORIES, EMPTY_DRAFT, URGENCIES, URGENCY_PRIORITY, composeDescription, findSimilarTickets, parseDraft, targetHours,
  type Category, type TicketDraft, type Urgency,
} from "@/lib/ticket-view";
import { TICKET_TYPES, type SupportTicket } from "@shared/ticket-policy";
import { ICONS, Icon, TypeIcon } from "./ticket-ui";

const STEPS = ["stepType", "stepDetails", "stepReview"] as const;
const TYPE_HINT = { incident: "hintIncident", request: "hintRequest", problem: "hintProblem", change: "hintChange" } as const;
const WHAT = { incident: "whatIncident", request: "whatRequest", problem: "whatProblem", change: "whatChange" } as const;
const URGENCY_KEY = { whenever: "urgWhenever", normal: "urgNormal", blocking: "urgBlocking", emergency: "urgEmergency" } as const;
const CATEGORY_KEY = {
  general: "catGeneral", account: "catAccount", billing: "catBilling", listing: "catListing", technical: "catTechnical", feedback: "catFeedback",
} as const;

interface Props {
  open: boolean;
  userId: number;
  existing: SupportTicket[];
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
  onOpenExisting: (id: number) => void;
}

export function CreateTicketDialog({ open, userId, existing, onClose, onCreated, onOpenExisting }: Props) {
  const t = useSupportCopy();
  const storageKey = `verso-ticket-draft:${userId}`;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TicketDraft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!open) return;
    let saved: TicketDraft | null = null;
    try { saved = parseDraft(window.localStorage.getItem(storageKey)); } catch { /* storage blocked */ }
    setDraft(saved ?? EMPTY_DRAFT);
    setRestored(saved !== null);
    setStep(saved ? 1 : 0);
  }, [open, storageKey]);

  const update = (patch: Partial<TicketDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage blocked */ }
  };
  const clearDraft = () => {
    try { window.localStorage.removeItem(storageKey); } catch { /* storage blocked */ }
  };

  const create = useMutation({
    mutationFn: () => ticketRequest<SupportTicket>("/api/tickets", "POST", {
      title: draft.title.trim(),
      description: composeDescription(draft, { what: "", expected: t("expected"), steps: t("steps") }),
      type: draft.type,
      priority: URGENCY_PRIORITY[draft.urgency],
      category: draft.category,
    }),
    onSuccess: (ticket) => { clearDraft(); setDraft(EMPTY_DRAFT); setRestored(false); onCreated(ticket); },
  });

  const similar = useMemo(() => findSimilarTickets(existing, draft.title), [existing, draft.title]);
  const type = (TICKET_TYPES as readonly string[]).includes(draft.type) ? (draft.type as keyof typeof TYPE_HINT) : "incident";
  const titleOk = draft.title.trim().length > 0;
  const showExpected = type === "incident" || type === "change";
  const showSteps = type === "incident" || type === "problem";

  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <DialogContent className="sw-dialog max-h-[92vh] max-w-xl overflow-y-auto p-0">
      <div className="sw-scope sw-wiz">
        <header className="sw-wiz-head">
          <DialogTitle className="sw-wiz-title">{t("newTicket")}</DialogTitle>
          <DialogDescription className="sw-wiz-sub">{t(STEPS[step])}</DialogDescription>
          <ol className="sw-steps" aria-label={t("progress")}>
            {STEPS.map((key, index) => <li key={key} className={index === step ? "is-now" : index < step ? "is-done" : ""} aria-current={index === step ? "step" : undefined}>
              <span>{index < step ? <Icon d={ICONS.check} /> : index + 1}</span>{t(key)}
            </li>)}
          </ol>
        </header>

        <form className="sw-wiz-body" onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) { if (step === 1 && !titleOk) return; setStep(step + 1); } else create.mutate();
        }}>
          {restored && step > 0 && <p className="sw-wiz-note">{t("draftRestored")} · <button type="button" className="sw-link" onClick={() => { clearDraft(); setDraft(EMPTY_DRAFT); setRestored(false); setStep(0); }}>{t("discardDraft")}</button></p>}

          {step === 0 && <div className="sw-tiles" role="radiogroup" aria-label={t("stepType")}>
            {TICKET_TYPES.map((value) => <button key={value} type="button" role="radio" aria-checked={draft.type === value}
              className={`sw-tile${draft.type === value ? " is-on" : ""}`} onClick={() => { update({ type: value }); setStep(1); }}>
              <TypeIcon type={value} /><b>{t(value)}</b><span>{t(TYPE_HINT[value])}</span>
            </button>)}
          </div>}

          {step === 1 && <>
            <label className="sw-field"><span>{t("summary")}</span>
              <input required maxLength={200} value={draft.title} autoFocus onChange={(e) => update({ title: e.target.value })} aria-describedby="sw-title-hint" />
            </label>
            {!titleOk && <p id="sw-title-hint" className="sw-meta">{t("titleNeeded")}</p>}
            {similar.length > 0 && <div className="sw-similar" role="status">
              <b>{t("similarTitle")}</b><p>{t("similarHint")}</p>
              {similar.map((ticket) => <button key={ticket.id} type="button" className="sw-link" onClick={() => { onClose(); onOpenExisting(ticket.id); }}>#{ticket.id} · {ticket.title}</button>)}
            </div>}
            <label className="sw-field"><span>{t(WHAT[type])}</span>
              <textarea maxLength={3000} rows={4} value={draft.what} onChange={(e) => update({ what: e.target.value })} /></label>
            {showExpected && <label className="sw-field"><span>{t("expected")}</span>
              <textarea maxLength={1000} rows={2} value={draft.expected} onChange={(e) => update({ expected: e.target.value })} /></label>}
            {showSteps && <label className="sw-field"><span>{t("steps")}</span>
              <textarea maxLength={1000} rows={3} value={draft.steps} onChange={(e) => update({ steps: e.target.value })} /></label>}
            <fieldset className="sw-field"><legend>{t("category")}</legend>
              <div className="sw-chips">{CATEGORIES.map((value) => <button key={value} type="button" aria-pressed={draft.category === value}
                className={`sw-chip${draft.category === value ? " is-on" : ""}`} onClick={() => update({ category: value as Category })}>{t(CATEGORY_KEY[value])}</button>)}</div>
            </fieldset>
            <fieldset className="sw-field"><legend>{t("urgency")}</legend>
              <div className="sw-chips">{URGENCIES.map((value) => <button key={value} type="button" aria-pressed={draft.urgency === value}
                className={`sw-chip sw-chip-${value}${draft.urgency === value ? " is-on" : ""}`} onClick={() => update({ urgency: value as Urgency })}>{t(URGENCY_KEY[value])}</button>)}</div>
              <p className="sw-meta">{t("respondWithin")} {targetHours(draft.urgency)}{t("hoursShort")}</p>
            </fieldset>
          </>}

          {step === 2 && <div className="sw-review">
            <p className="sw-meta">{t("reviewHint")}</p>
            <dl>
              <div><dt>{t("ticketType")}</dt><dd>{t(type)}</dd></div>
              <div><dt>{t("summary")}</dt><dd>{draft.title}</dd></div>
              <div><dt>{t("category")}</dt><dd>{t(CATEGORY_KEY[draft.category])}</dd></div>
              <div><dt>{t("urgency")}</dt><dd>{t(URGENCY_KEY[draft.urgency])} · {t("respondWithin")} {targetHours(draft.urgency)}{t("hoursShort")}</dd></div>
              {draft.what.trim() && <div><dt>{t(WHAT[type])}</dt><dd className="sw-pre">{draft.what}</dd></div>}
              {showExpected && draft.expected.trim() && <div><dt>{t("expected")}</dt><dd className="sw-pre">{draft.expected}</dd></div>}
              {showSteps && draft.steps.trim() && <div><dt>{t("steps")}</dt><dd className="sw-pre">{draft.steps}</dd></div>}
            </dl>
          </div>}

          {create.isError && <p role="alert" className="sw-error">{errorText(create.error)}</p>}

          <footer className="sw-wiz-foot">
            {step > 0 ? <button type="button" className="sw-btn" onClick={() => setStep(step - 1)}>{t("back")}</button>
              : <button type="button" className="sw-btn" onClick={onClose}>{t("cancel")}</button>}
            {step > 0 && <button type="submit" className="sw-btn sw-btn-amber" disabled={(step === 1 && !titleOk) || create.isPending}>
              {step === 2 ? t("create") : t("next")}<Icon d={ICONS.arrow} />
            </button>}
          </footer>
        </form>
      </div>
    </DialogContent>
  </Dialog>;
}

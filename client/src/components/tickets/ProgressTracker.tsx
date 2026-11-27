import type { SupportTicket } from "@shared/ticket-policy";
import { STAGES, ticketProgress } from "@/lib/ticket-view";
import { ICONS, Icon, type Translate } from "./ticket-ui";

const STAGE_KEY = { received: "stageReceived", assigned: "stageAssigned", working: "stageWorking", resolved: "stageResolved" } as const;

export function ProgressTracker({ ticket, t }: { ticket: SupportTicket; t: Translate }) {
  const progress = ticketProgress(ticket);
  const waitingText = progress.waitingOn === "approval" ? t("waitingApproval")
    : progress.waitingOn ? `${t("waitingOn")} ${t(progress.waitingOn as "customer" | "internal" | "third-party")}` : t("waitingGeneric");
  return <div className="sw-progress">
    <ol className="sw-stages" aria-label={t("progress")}>
      {STAGES.map((stage, index) => {
        const state = progress.ended ? "off" : index < progress.index ? "done" : index === progress.index ? "now" : "todo";
        return <li key={stage} className={`sw-stage is-${state}${state === "now" && progress.waiting ? " is-waiting" : ""}`}
          aria-current={state === "now" ? "step" : undefined}>
          <span className="sw-stage-dot">{state === "done" ? <Icon d={ICONS.check} /> : index + 1}</span>
          <span className="sw-stage-name">{t(STAGE_KEY[stage])}</span>
        </li>;
      })}
    </ol>
    {progress.ended && <p className="sw-progress-note">{t("stageEnded")}</p>}
    {progress.waiting && !progress.ended && <p className="sw-progress-note is-waiting"><Icon d={ICONS.pause} />{waitingText}</p>}
  </div>;
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { errorText, ticketRequest } from "@/lib/support-api";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { formatMinutes, TICKET_PRIORITIES, TICKET_TYPES, type SlaBreakdown, type SlaReport } from "@shared/ticket-policy";

const PERIODS = [7, 30, 90] as const;
const selectClass = "min-h-11 rounded-md border border-slate-400 bg-white px-3 text-slate-900 max-w-full";
const percent = (rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);
const duration = (hours: number | null) => (hours === null ? "—" : formatMinutes(hours * 60));

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border bg-slate-50 p-3">
    <dt className="text-xs text-slate-600">{label}</dt>
    <dd className="mt-1 text-lg font-bold">{value}</dd>
  </div>;
}

function Breakdown({ title, column, rows, known }: {
  title: string; column: string; rows: SlaBreakdown[]; known: readonly string[];
}) {
  const t = useSupportCopy();
  // A legacy value outside the known set is shown as stored rather than failing to translate.
  const label = (key: string) => known.includes(key) ? t(key as (typeof TICKET_PRIORITIES)[number] | (typeof TICKET_TYPES)[number]) : key;
  return <div>
    <h3 className="font-semibold">{title}</h3>
    <div role="region" aria-label={title} tabIndex={0} className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <caption className="sr-only">{title}</caption>
        <thead><tr className="border-b">
          <th scope="col" className="py-2 pr-3">{column}</th>
          <th scope="col" className="px-3 py-2">{t("createdCount")}</th>
          <th scope="col" className="px-3 py-2">{t("resolved")}</th>
          <th scope="col" className="px-3 py-2">{t("slaMet")}</th>
          <th scope="col" className="px-3 py-2">{t("slaBreached")}</th>
          <th scope="col" className="px-3 py-2">{t("slaCompliance")}</th>
          <th scope="col" className="px-3 py-2">{t("timeLogged")}</th>
        </tr></thead>
        <tbody>{rows.map((row) => <tr key={row.key} className="border-b">
          <th scope="row" className="py-2 pr-3 font-medium">{label(row.key)}</th>
          <td className="px-3 py-2">{row.created}</td>
          <td className="px-3 py-2">{row.resolved}</td>
          <td className="px-3 py-2">{row.met}</td>
          <td className="px-3 py-2">{row.breached}</td>
          <td className="px-3 py-2">{percent(row.complianceRate)}</td>
          <td className="px-3 py-2">{formatMinutes(row.timeSpentMinutes)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

function ReportBody({ report, onOpen }: { report: SlaReport; onOpen: (id: number) => void }) {
  const t = useSupportCopy();
  const { active } = report;
  return <div className="mt-4 space-y-5">
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label={t("slaCompliance")} value={percent(report.complianceRate)} />
      <Stat label={t("createdCount")} value={report.created} />
      <Stat label={t("resolved")} value={report.resolved} />
      <Stat label={t("avgResolution")} value={duration(report.avgResolutionHours)} />
      <Stat label={t("medianResolution")} value={duration(report.medianResolutionHours)} />
      <Stat label={t("timeLogged")} value={formatMinutes(report.timeSpentMinutes)} />
    </dl>
    {report.resolved === 0 && <p className="text-sm text-slate-600">{t("noResolved")}</p>}
    <div>
      <h3 className="font-semibold">{t("activeTickets")}: {active.total}</h3>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <li className={active.breached ? "font-semibold text-red-700" : ""}>{t("slaBreached")}: {active.breached}</li>
        <li className={active.atRisk ? "font-semibold text-amber-800" : ""}>{t("slaAtRisk")}: {active.atRisk}</li>
        <li>{t("slaPaused")}: {active.paused}</li>
        <li>{t("slaOnTrack")}: {active.onTrack}</li>
      </ul>
    </div>
    <Breakdown title={t("byPriority")} column={t("priority")} rows={report.byPriority} known={TICKET_PRIORITIES} />
    <Breakdown title={t("byType")} column={t("ticketType")} rows={report.byType} known={TICKET_TYPES} />
    <div>
      <h3 className="font-semibold">{t("needsAttention")}</h3>
      {report.attention.length === 0 ? <p className="mt-2 text-sm">{t("noAttention")}</p> :
        <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto text-sm">{report.attention.map((item) =>
          <li key={item.id} className="break-words border-b pb-2">
            <button className="underline" onClick={() => onOpen(item.id)}>#{item.id}</button> · {item.title} · {t(item.priority)} ·{" "}
            <span className={item.state === "breached" ? "font-semibold text-red-700" : "font-semibold text-amber-800"}>
              {t(item.state === "breached" ? "slaBreached" : "slaAtRisk")}
            </span> · {new Date(item.sla_due_at).toLocaleString()}
          </li>)}</ul>}
    </div>
  </div>;
}

export function TicketSlaReport({ userId, onOpen }: { userId: number; onOpen: (id: number) => void }) {
  const t = useSupportCopy();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const report = useQuery<SlaReport>({
    queryKey: ["support-sla-report", userId, days],
    enabled: open,
    queryFn: () => ticketRequest(`/api/tickets/reports/sla?days=${days}`),
    placeholderData: (previous) => previous,
    refetchInterval: open ? 60000 : false,
  });
  return <section className="rounded-xl border bg-white p-5" aria-labelledby="sla-report-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="sla-report-title" className="font-bold">{t("slaReport")}</h2>
      <div className="flex flex-wrap items-center gap-3">
        {open && <label className="text-sm">{t("period")}
          <select className={`${selectClass} ml-2`} value={days} onChange={(e) => setDays(Number(e.target.value) as (typeof PERIODS)[number])}>
            {PERIODS.map((value) => <option key={value} value={value}>{value} {t("days")}</option>)}
          </select></label>}
        <Button variant="outline" aria-expanded={open} aria-controls="sla-report-body" onClick={() => setOpen(!open)}>{t(open ? "hide" : "show")}</Button>
      </div>
    </div>
    <div id="sla-report-body">
      {open && report.isPending && <p className="mt-3">{t("loading")}</p>}
      {open && report.isError && <p role="alert" className="mt-3">{errorText(report.error)} <Button onClick={() => void report.refetch()}>{t("retry")}</Button></p>}
      {open && report.data && <ReportBody report={report.data} onOpen={onOpen} />}
    </div>
  </section>;
}

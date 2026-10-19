import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WORK_STATUSES, IMPLEMENTATION_LOTS } from "@shared/implementation-plan";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { ticketRequest } from "@/lib/support-api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Lot = {
  id: (typeof IMPLEMENTATION_LOTS)[number]["id"]; title: string; priority: string; dependsOn: readonly string[]; acceptance: string;
  status: (typeof WORK_STATUSES)[number]; evidence: string; blocker: string; updated_at?: string;
  release?: string | null;
};
export default function ImplementationTracker() {
  const t = useSupportCopy();
  const client = useQueryClient();
  const lots = useQuery<Lot[]>({
    queryKey: ["implementation-tracking"],
    queryFn: () => ticketRequest("/api/implementation-tracking"),
    refetchInterval: 15000,
  });
  const [editing, setEditing] = useState<Lot | null>(null);
  const [status, setStatus] = useState<Lot["status"]>("todo");
  const [evidence, setEvidence] = useState("");
  const [blocker, setBlocker] = useState("");
  const save = useMutation({
    mutationFn: () => ticketRequest(`/api/implementation-tracking/${editing!.id}`, "PUT", { status, evidence, blocker }),
    onSuccess: () => { setEditing(null); void client.invalidateQueries({ queryKey: ["implementation-tracking"] }); },
  });
  return <section className="m-4 rounded-xl border border-slate-300 bg-white p-5 text-slate-900" data-testid="implementation-tracker">
    <h2 className="text-xl font-bold">{t("tracker")}</h2>
    <p className="mt-2 text-sm text-slate-600">{t("trackerInfo")}</p>
    {lots.data?.[0]?.release && <p className="mt-2 break-all text-xs">{t("release")}: {lots.data[0].release}</p>}
    {lots.isPending && <p>{t("loading")}</p>}
    {lots.isError && <p role="alert">{lots.error.message} <Button onClick={() => void lots.refetch()}>{t("retry")}</Button></p>}
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {lots.data?.map((lot) => <article key={lot.id} className="min-w-0 rounded-lg border p-4">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{lot.id} · {t(lot.id)}</h3><span>{lot.priority} · {t(lot.status)}</span></div>
        <p className="mt-2 text-sm">{t(`${lot.id}-acceptance`)}</p>
        <p className="mt-2 text-xs">{t("dependencies")}: {lot.dependsOn.join(", ") || "—"}</p>
        {lot.evidence && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{lot.evidence}</p>}
        {lot.blocker && <p className="mt-2 break-words text-sm text-red-700">{t("blocker")}: {lot.blocker}</p>}
        {lot.updated_at && <p className="mt-2 text-xs">{new Date(lot.updated_at).toLocaleString()}</p>}
        <Button variant="outline" className="mt-3" onClick={() => {
          setEditing(lot); setStatus(lot.status); setEvidence(lot.evidence); setBlocker(lot.blocker); save.reset();
        }}>{t("save")}</Button>
      </article>)}
    </div>
    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900">
        <DialogTitle>{editing?.id} · {t("tracker")}</DialogTitle><DialogDescription>{t("trackerInfo")}</DialogDescription>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <label className="block">{t("status")}<select className="ml-2 min-h-11 border bg-white p-2" value={status}
            onChange={(e) => setStatus(e.target.value as Lot["status"])}>
            {WORK_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
          </select></label>
          <label className="block">{t("evidence")}<Textarea maxLength={10000} value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
          <label className="block">{t("blocker")}<Textarea maxLength={2000} value={blocker} onChange={(e) => setBlocker(e.target.value)} /></label>
          {save.isError && <p role="alert">{save.error.message}</p>}
          <Button disabled={save.isPending} type="submit">{t("save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}

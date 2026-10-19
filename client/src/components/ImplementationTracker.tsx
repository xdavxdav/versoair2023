import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WORK_STATUSES, IMPLEMENTATION_LOTS } from "@shared/implementation-plan";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { ticketRequest } from "@/lib/support-api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Lot = {
  id: (typeof IMPLEMENTATION_LOTS)[number]["id"];
  title: string;
  priority: string;
  dependsOn: readonly string[];
  acceptance: string;
  status: (typeof WORK_STATUSES)[number];
  evidence: string;
  blocker: string;
  updated_at?: string;
  release?: string | null;
};

type TrackerHistoryEntry = {
  id: string;
  lotId: string;
  changes: Record<string, unknown>;
  release: string | null;
  createdAt: string;
  changedBy: string;
};

type TrackerSignal = {
  id: string;
  lotId: string;
  changes: { message?: string };
  release: string | null;
  createdAt: string;
  reportedBy: string;
};

export default function ImplementationTracker({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const t = useSupportCopy();
  const client = useQueryClient();
  const lots = useQuery<Lot[]>({
    queryKey: ["implementation-tracking"],
    queryFn: () => ticketRequest("/api/implementation-tracking"),
    refetchInterval: 15000,
  });
  const history = useQuery<TrackerHistoryEntry[]>({
    queryKey: ["implementation-tracking", "activity"],
    queryFn: () => ticketRequest("/api/implementation-tracking/activity"),
  });
  const signals = useQuery<TrackerSignal[]>({
    queryKey: ["implementation-tracking", "signals"],
    queryFn: () => ticketRequest("/api/implementation-tracking/signals"),
    enabled: !readOnly,
  });
  const [editing, setEditing] = useState<Lot | null>(null);
  const [status, setStatus] = useState<Lot["status"]>("todo");
  const [evidence, setEvidence] = useState("");
  const [blocker, setBlocker] = useState("");
  const [signalLotId, setSignalLotId] = useState<string>(
    IMPLEMENTATION_LOTS[0]?.id ?? "",
  );
  const [signalMessage, setSignalMessage] = useState("");
  const save = useMutation({
    mutationFn: () =>
      ticketRequest(
        `/api/implementation-tracking/${editing!.id}`,
        "PUT",
        { status, evidence, blocker },
      ),
    onSuccess: () => {
      setEditing(null);
      void client.invalidateQueries({ queryKey: ["implementation-tracking"] });
      void client.invalidateQueries({
        queryKey: ["implementation-tracking", "activity"],
      });
    },
  });
  const sendSignal = useMutation({
    mutationFn: () =>
      ticketRequest("/api/implementation-tracking/signals", "POST", {
        lotId: signalLotId,
        message: signalMessage,
      }),
    onSuccess: () => {
      setSignalMessage("");
      void client.invalidateQueries({
        queryKey: ["implementation-tracking", "signals"],
      });
    },
  });

  return (
    <section
      className="m-4 rounded-xl border border-slate-300 bg-white p-5 text-slate-900"
      data-testid="implementation-tracker"
    >
      <h2 className="text-xl font-bold">{t("tracker")}</h2>
      <p className="mt-2 text-sm text-slate-600">{t("trackerInfo")}</p>
      {readOnly && (
        <p className="mt-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          {t("trackerReadOnly")}
        </p>
      )}
      {lots.data?.[0]?.release && (
        <p className="mt-2 break-all text-xs">
          {t("release")}: {lots.data[0].release}
        </p>
      )}
      {lots.isPending && <p>{t("loading")}</p>}
      {lots.isError && (
        <p role="alert">
          {lots.error.message}{" "}
          <Button onClick={() => void lots.refetch()}>{t("retry")}</Button>
        </p>
      )}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {lots.data?.map((lot) => (
          <article
            key={lot.id}
            className="min-w-0 rounded-lg border p-4"
            data-testid={`implementation-lot-${lot.id}`}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-bold">
                {lot.id} · {t(lot.id)}
              </h3>
              <span>
                {lot.priority} · {t(lot.status)}
              </span>
            </div>
            <p className="mt-2 text-sm">{t(`${lot.id}-acceptance`)}</p>
            <p className="mt-2 text-xs">
              {t("dependencies")}: {lot.dependsOn.join(", ") || "—"}
            </p>
            {lot.evidence && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                {lot.evidence}
              </p>
            )}
            {lot.blocker && (
              <p className="mt-2 break-words text-sm text-red-700">
                {t("blocker")}: {lot.blocker}
              </p>
            )}
            {lot.updated_at && (
              <p className="mt-2 text-xs">
                {new Date(lot.updated_at).toLocaleString()}
              </p>
            )}
            {!readOnly && (
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setEditing(lot);
                  setStatus(lot.status);
                  setEvidence(lot.evidence);
                  setBlocker(lot.blocker);
                  save.reset();
                }}
              >
                {t("save")}
              </Button>
            )}
          </article>
        ))}
      </div>

      <section className="mt-8 border-t pt-5" aria-labelledby="tracker-history">
        <h3 id="tracker-history" className="font-semibold">
          {t("activity")}
        </h3>
        {history.isError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {history.error.message}{" "}
            <Button
              variant="outline"
              onClick={() => void history.refetch()}
            >
              {t("retry")}
            </Button>
          </p>
        )}
        {history.data?.length ? (
          <ol className="mt-3 space-y-3">
            {history.data.map((entry) => (
              <li key={entry.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {entry.lotId} · {t("changedBy")}: {entry.changedBy}
                  </span>
                  <time dateTime={entry.createdAt}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {t("version")}: {entry.release || "—"}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs">
                    {t("evidence")}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(entry.changes, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ol>
        ) : (
          !history.isPending &&
          !history.isError && (
            <p className="mt-2 text-sm text-slate-600">{t("empty")}</p>
          )
        )}
      </section>

      {readOnly ? (
        <section className="mt-8 border-t pt-5">
          <h3 className="font-semibold">{t("signalOwner")}</h3>
          <p className="mt-1 text-sm text-slate-600">{t("trackerReadOnly")}</p>
          <form
            className="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              sendSignal.mutate();
            }}
          >
            <label className="sr-only" htmlFor="tracker-signal-lot">
              {t("tracker")}
            </label>
            <select
              id="tracker-signal-lot"
              className="min-h-11 rounded-md border bg-white px-3"
              value={signalLotId}
              onChange={(event) => setSignalLotId(event.target.value)}
            >
              {IMPLEMENTATION_LOTS.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.id} · {t(lot.id)}
                </option>
              ))}
            </select>
            <Textarea
              aria-label={t("signalMessage")}
              maxLength={2000}
              value={signalMessage}
              onChange={(event) => setSignalMessage(event.target.value)}
              placeholder={t("signalMessage")}
              required
            />
            <Button
              type="submit"
              disabled={
                sendSignal.isPending ||
                signalMessage.trim().length === 0 ||
                signalMessage.length > 2000
              }
            >
              {sendSignal.isPending ? t("loading") : t("sendSignal")}
            </Button>
          </form>
          {sendSignal.isError && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {sendSignal.error.message || t("signalError")}
            </p>
          )}
          {sendSignal.isSuccess && (
            <p role="status" className="mt-2 text-sm text-emerald-700">
              {t("signalSent")}
            </p>
          )}
        </section>
      ) : (
        <section className="mt-8 border-t pt-5">
          <h3 className="font-semibold">{t("signalsReceived")}</h3>
          {signals.isError && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {signals.error.message}{" "}
              <Button
                variant="outline"
                onClick={() => void signals.refetch()}
              >
                {t("retry")}
              </Button>
            </p>
          )}
          {signals.data?.length ? (
            <ul className="mt-3 space-y-3">
              {signals.data.map((signal) => (
                <li key={signal.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    {signal.lotId} · {signal.reportedBy}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {signal.changes.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {new Date(signal.createdAt).toLocaleString()} ·{" "}
                    {t("version")}: {signal.release || "—"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            !signals.isPending &&
            !signals.isError && (
              <p className="mt-2 text-sm text-slate-600">{t("noSignals")}</p>
            )
          )}
        </section>
      )}

      {!readOnly && (
        <Dialog
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900">
            <DialogTitle>
              {editing?.id} · {t("tracker")}
            </DialogTitle>
            <DialogDescription>{t("trackerInfo")}</DialogDescription>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate();
              }}
            >
              <label className="block">
                {t("status")}
                <select
                  className="ml-2 min-h-11 border bg-white p-2"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as Lot["status"])
                  }
                >
                  {WORK_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {t(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                {t("evidence")}
                <Textarea
                  maxLength={10000}
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                />
              </label>
              <label className="block">
                {t("blocker")}
                <Textarea
                  maxLength={2000}
                  value={blocker}
                  onChange={(event) => setBlocker(event.target.value)}
                />
              </label>
              {save.isError && <p role="alert">{save.error.message}</p>}
              <Button disabled={save.isPending} type="submit">
                {t("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

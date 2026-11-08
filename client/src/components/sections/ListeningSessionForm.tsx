import { useCallback, useId, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  SESSION_LIMITS,
  type AdminHostOption,
  type AdminSessionDetail,
  type AdminSessionSummary,
} from "@shared/listening-session";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ADMIN_TIME_ZONES,
  ZONED_TIME_MESSAGES,
  buildCreatePayload,
  buildUpdatePayload,
  draftFromSession,
  emptyDraft,
  startInMinutes,
  zonedTimeToUtc,
  type CreatePayload,
  type DraftIssue,
  type SessionDraft,
  type UpdatePayload,
} from "@/lib/listening-session-admin";
import { adminApi, adminErrorMessage, adminKeys } from "@/lib/listening-session-admin-api";
import type { RowsUpdate } from "@/lib/listening-session-admin-set";
import { formatSessionWhen } from "@/lib/listening-session-format";
import { HostPicker } from "./ListeningSessionHostPicker";
import { SetBuilder } from "./ListeningSessionSetBuilder";

const QUICK_START_MINUTES = [5, 10, 15, 30] as const;
// The order the fields appear in, so a failed save puts the focus on the first problem.
const FIELD_ORDER: readonly DraftIssue["field"][] = ["title", "start", "gap", "description", "set"];

type SaveJob =
  | { kind: "create"; payload: CreatePayload }
  | { kind: "update"; id: number; payload: UpdatePayload };

interface FormProps {
  /** The session being edited; null starts a new one. */
  original: AdminSessionDetail | null;
  timeZone: string;
  sessions: readonly AdminSessionSummary[];
  clockNotice: string | null;
  onSaved: (session: AdminSessionDetail, outcome: "created" | "updated") => void;
  onBack: () => void;
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  return message ? (
    <p id={id} className="text-sm text-red-700" role="alert">
      {message}
    </p>
  ) : null;
}

export function ListeningSessionForm({ original, timeZone, sessions, clockNotice, onSaved, onBack }: FormProps) {
  const queryClient = useQueryClient();
  const uid = useId();
  const [draft, setDraft] = useState<SessionDraft>(() =>
    original ? draftFromSession(original, timeZone) : emptyDraft(timeZone),
  );
  const [hostName, setHostName] = useState<string | null>(original?.hostName ?? null);
  // The set is only sent with an edit when it was touched, because the server re-checks every track then.
  const [setEdited, setSetEdited] = useState(false);
  const [issues, setIssues] = useState<DraftIssue[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ids: Record<DraftIssue["field"], string> = {
    title: `${uid}-title`,
    description: `${uid}-description`,
    start: `${uid}-start`,
    gap: `${uid}-gap`,
    set: `${uid}-track-search`,
  };
  const issueFor = (field: DraftIssue["field"]): string | null =>
    issues.find((issue) => issue.field === field)?.message ?? null;

  function updateDraft(patch: Partial<SessionDraft>, field?: DraftIssue["field"]) {
    setDraft((current) => ({ ...current, ...patch }));
    if (field) setIssues((current) => current.filter((issue) => issue.field !== field));
    setNotice(null);
  }

  const changeRows = useCallback((update: RowsUpdate) => {
    setDraft((current) => ({ ...current, rows: update(current.rows) }));
    setSetEdited(true);
    setIssues((current) => current.filter((issue) => issue.field !== "set"));
    setNotice(null);
  }, []);

  const start = useMemo(
    () => (draft.localStart ? zonedTimeToUtc(draft.localStart, draft.timeZone) : null),
    [draft.localStart, draft.timeZone],
  );
  const gapValid =
    Number.isInteger(draft.gapSeconds) && draft.gapSeconds >= 0 && draft.gapSeconds <= SESSION_LIMITS.gapSecondsMax;

  const initialHostId = original?.hostUserId ?? null;
  const hostChanged = draft.hostUserId !== initialHostId;
  const hostLabel = hostChanged
    ? (hostName ?? "The chosen host")
    : original
      ? (original.hostName ?? "None set")
      : "You (the signed-in admin)";

  function chooseHost(host: AdminHostOption) {
    setHostName(host.name);
    updateDraft({ hostUserId: host.id });
  }

  function resetHost() {
    setHostName(original?.hostName ?? null);
    updateDraft({ hostUserId: initialHostId });
  }

  const save = useMutation({
    mutationFn: (job: SaveJob) =>
      job.kind === "create" ? adminApi.createSession(job.payload) : adminApi.updateSession(job.id, job.payload),
    onSuccess: (session, job) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.list });
      onSaved(session, job.kind === "create" ? "created" : "updated");
    },
    onError: (error) => setServerError(adminErrorMessage(error, "Could not save the session.")),
  });

  function reportIssues(found: DraftIssue[]) {
    setIssues(found);
    const first = FIELD_ORDER.find((field) => found.some((issue) => issue.field === field));
    if (first) document.getElementById(ids[first])?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setNotice(null);
    const nowMs = Date.now();
    if (original) {
      const built = buildUpdatePayload(original, draft, { nowMs, setEdited });
      if (!built.ok) return reportIssues(built.issues);
      setIssues([]);
      if (Object.keys(built.payload).length === 0) {
        setNotice("Nothing to change.");
        return;
      }
      save.mutate({ kind: "update", id: original.id, payload: built.payload });
      return;
    }
    const built = buildCreatePayload(draft, { nowMs });
    if (!built.ok) return reportIssues(built.issues);
    setIssues([]);
    save.mutate({ kind: "create", payload: built.payload });
  }

  const titleError = issueFor("title");
  const startError = issueFor("start");
  const gapError = issueFor("gap");
  const descriptionError = issueFor("description");

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={submit}
      // Enter inside a search box or a length field must not save the whole session.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{original ? "Edit session" : "New listening session"}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back to sessions
        </Button>
      </div>

      <section aria-label="Session details" className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={ids.title}>Title</Label>
          <Input
            id={ids.title}
            value={draft.title}
            aria-invalid={titleError !== null}
            aria-describedby={titleError ? `${ids.title}-error` : `${ids.title}-hint`}
            onChange={(event) => updateDraft({ title: event.target.value }, "title")}
          />
          <p id={`${ids.title}-hint`} className="text-xs text-slate-500">
            Up to {SESSION_LIMITS.titleMax} characters. Shown on the public page.
          </p>
          <FieldError id={`${ids.title}-error`} message={titleError} />
        </div>

        <HostPicker
          inputId={`${uid}-host`}
          currentLabel={hostLabel}
          changed={hostChanged}
          resetLabel={original ? "Keep the current host" : "Host it myself"}
          onSelect={chooseHost}
          onReset={resetHost}
        />

        <div className="space-y-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={ids.start}>Start date and time</Label>
              <Input
                id={ids.start}
                type="datetime-local"
                value={draft.localStart}
                aria-invalid={startError !== null}
                aria-describedby={`${ids.start}-resolved${startError ? ` ${ids.start}-error` : ""}`}
                onChange={(event) => updateDraft({ localStart: event.target.value }, "start")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-zone`}>Time zone of that start time</Label>
              <select
                id={`${uid}-zone`}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={draft.timeZone}
                onChange={(event) => updateDraft({ timeZone: event.target.value }, "start")}
              >
                {ADMIN_TIME_ZONES.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p id={`${ids.start}-resolved`} className="min-h-5 text-sm text-slate-700" role="status" aria-live="polite">
            {start?.ok && `Starts ${formatSessionWhen(start.iso, "en", { timeZone: draft.timeZone })}`}
            {start && !start.ok && <span className="text-amber-700">{ZONED_TIME_MESSAGES[start.reason]}</span>}
          </p>
          <FieldError id={`${ids.start}-error`} message={startError} />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick start">
            <span className="text-sm text-slate-600">Quick start, handy for a live test:</span>
            {QUICK_START_MINUTES.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  updateDraft({ localStart: startInMinutes(Date.now(), minutes, draft.timeZone) }, "start")
                }
              >
                Start in {minutes} min
              </Button>
            ))}
          </div>
          {clockNotice && <p className="text-sm text-amber-700">{clockNotice}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.gap}>Pause between tracks (seconds)</Label>
          <Input
            id={ids.gap}
            type="number"
            inputMode="numeric"
            min={0}
            max={SESSION_LIMITS.gapSecondsMax}
            step={1}
            className="w-40"
            value={Number.isNaN(draft.gapSeconds) ? "" : draft.gapSeconds}
            aria-invalid={gapError !== null}
            aria-describedby={gapError ? `${ids.gap}-error` : `${ids.gap}-hint`}
            onChange={(event) =>
              updateDraft({ gapSeconds: event.target.value === "" ? Number.NaN : Number(event.target.value) }, "gap")
            }
          />
          <p id={`${ids.gap}-hint`} className="text-xs text-slate-500">
            From 0 to {SESSION_LIMITS.gapSecondsMax} seconds of silence between two tracks.
          </p>
          <FieldError id={`${ids.gap}-error`} message={gapError} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.description}>Description (optional)</Label>
          <Textarea
            id={ids.description}
            rows={3}
            value={draft.description}
            aria-invalid={descriptionError !== null}
            aria-describedby={descriptionError ? `${ids.description}-error` : undefined}
            onChange={(event) => updateDraft({ description: event.target.value }, "description")}
          />
          <FieldError id={`${ids.description}-error`} message={descriptionError} />
        </div>
      </section>

      <SetBuilder
        rows={draft.rows}
        onRowsChange={changeRows}
        gapSeconds={gapValid ? draft.gapSeconds : null}
        startsAt={start?.ok ? start.iso : null}
        timeZone={draft.timeZone}
        sessions={sessions}
        excludeSessionId={original?.id}
        searchInputId={ids.set}
        issue={issueFor("set")}
      />

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <p className="text-sm text-slate-700" role="status">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {original ? "Save changes" : "Create session"}
        </Button>
        <Button type="button" variant="outline" onClick={onBack} disabled={save.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

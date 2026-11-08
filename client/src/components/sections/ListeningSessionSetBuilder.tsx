import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, ArrowUpDown } from "lucide-react";
import { SESSION_LIMITS, type AdminSessionSummary } from "@shared/listening-session";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  findOverlaps,
  previewEndsAt,
  signedFirst,
  summarizeSet,
  type SetRow,
} from "@/lib/listening-session-admin";
import { createDurationMeasurer, type DurationMeasurer } from "@/lib/listening-session-admin-measure";
import {
  applyMeasuredDuration,
  pruneFailed,
  unmeasuredTrackIds,
  type RowsUpdate,
} from "@/lib/listening-session-admin-set";
import { formatSessionWhen, formatTotalLength } from "@/lib/listening-session-format";
import { PlaylistLoader } from "./ListeningSessionPlaylistLoader";
import { SetList } from "./ListeningSessionSetList";
import { TrackSearch } from "./ListeningSessionTrackSearch";

interface SetBuilderProps {
  rows: readonly SetRow[];
  onRowsChange: (update: RowsUpdate) => void;
  /** Null while the typed pause between tracks is not a valid number. */
  gapSeconds: number | null;
  /** The start as an ISO instant, or null while no valid start is chosen. */
  startsAt: string | null;
  timeZone: string;
  sessions: readonly AdminSessionSummary[];
  /** The session being edited, which never counts as an overlap with itself. */
  excludeSessionId?: number;
  searchInputId: string;
  issue: string | null;
}

const streamUrl = (trackId: number): string => `/api/music/tracks/${trackId}/stream`;

/**
 * Reads each unmeasured track's length in the browser through a hidden audio element and writes it
 * into the rows. The measurer is freed when the component goes away, so no download is left running.
 */
function useMeasuredLengths(rows: readonly SetRow[], onRowsChange: (update: RowsUpdate) => void) {
  const measurer = useRef<DurationMeasurer | null>(null);
  const onRowsChangeRef = useRef(onRowsChange);
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());

  useEffect(() => {
    onRowsChangeRef.current = onRowsChange;
  }, [onRowsChange]);

  useEffect(() => {
    const created = createDurationMeasurer({
      createAudio: () => new Audio(),
      streamUrl,
      onResult: (trackId, outcome) => {
        if (outcome.ok) {
          onRowsChangeRef.current((current) => applyMeasuredDuration(current, trackId, outcome.durationSec));
        } else {
          setFailed((current) => new Set(current).add(trackId));
        }
      },
    });
    measurer.current = created;
    return () => {
      created.dispose();
      measurer.current = null;
    };
  }, []);

  useEffect(() => {
    setFailed((current) => pruneFailed(current, rows));
  }, [rows]);

  useEffect(() => {
    measurer.current?.sync(unmeasuredTrackIds(rows, failed));
  }, [rows, failed]);

  const retry = useCallback((trackId: number) => {
    setFailed((current) => {
      const next = new Set(current);
      next.delete(trackId);
      return next;
    });
  }, []);

  return { failed, retry };
}

type SummaryProps = Pick<
  SetBuilderProps,
  "rows" | "gapSeconds" | "startsAt" | "timeZone" | "sessions" | "excludeSessionId"
>;

function SetSummary({ rows, gapSeconds, startsAt, timeZone, sessions, excludeSessionId }: SummaryProps) {
  const summary = summarizeSet(rows, gapSeconds ?? 0);
  const totalSec = gapSeconds === null ? null : summary.totalSec;
  const endsAt = gapSeconds === null ? null : previewEndsAt(startsAt, rows, gapSeconds);
  const startMs = startsAt ? Date.parse(startsAt) : Number.NaN;
  const endMs = endsAt ? Date.parse(endsAt) : Number.NaN;
  const overlaps =
    Number.isFinite(startMs) && Number.isFinite(endMs) ? findOverlaps(startMs, endMs, sessions, excludeSessionId) : [];

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Tracks</dt>
          <dd>
            {summary.count} · {summary.signed} signed · {summary.regular} regular
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Total length</dt>
          <dd>
            {totalSec === null ? "—" : formatTotalLength(totalSec)}
            {summary.unmeasured > 0 && ` (${summary.unmeasured} unknown)`}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Ends</dt>
          <dd>{endsAt ? formatSessionWhen(endsAt, "en", { timeZone }) : "—"}</dd>
        </div>
      </dl>
      {totalSec !== null && totalSec > SESSION_LIMITS.totalSecondsMax && (
        <p className="text-amber-700">
          A set can last at most {SESSION_LIMITS.totalSecondsMax / 3600} hours. Remove some tracks.
        </p>
      )}
      {summary.unavailable > 0 && (
        <p className="text-amber-700">
          {summary.unavailable} {summary.unavailable === 1 ? "track is" : "tracks are"} no longer published.
        </p>
      )}
      {overlaps.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription>
            <p className="font-medium">This set overlaps with another session:</p>
            <ul className="mt-1 list-disc pl-5">
              {overlaps.map((session) => (
                <li key={session.id}>
                  {session.title} ({formatSessionWhen(session.startsAt, "en", { timeZone })})
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function SetBuilder({
  rows,
  onRowsChange,
  gapSeconds,
  startsAt,
  timeZone,
  sessions,
  excludeSessionId,
  searchInputId,
  issue,
}: SetBuilderProps) {
  const headingId = useId();
  const { failed, retry } = useMeasuredLengths(rows, onRowsChange);

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <h3 id={headingId} className="text-base font-semibold text-slate-900">
        Set
      </h3>
      <TrackSearch inputId={searchInputId} rows={rows} onRowsChange={onRowsChange} />
      <PlaylistLoader rows={rows} onRowsChange={onRowsChange} />
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
          No tracks yet. Search above or load a playlist. Only published tracks can be added.
        </p>
      ) : (
        <>
          <SetList rows={rows} failed={failed} onRowsChange={onRowsChange} onRetryMeasure={retry} />
          <Button type="button" variant="outline" size="sm" disabled={rows.length < 2} onClick={() => onRowsChange(signedFirst)}>
            <ArrowUpDown className="h-4 w-4" /> Signed first
          </Button>
        </>
      )}
      <SetSummary
        rows={rows}
        gapSeconds={gapSeconds}
        startsAt={startsAt}
        timeZone={timeZone}
        sessions={sessions}
        excludeSessionId={excludeSessionId}
      />
      {issue && (
        <p className="text-sm text-red-700" role="alert">
          {issue}
        </p>
      )}
    </section>
  );
}

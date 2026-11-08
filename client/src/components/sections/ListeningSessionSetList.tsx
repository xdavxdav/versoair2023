import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { moveTrack, removeTrack, setRowDuration, type SetRow } from "@/lib/listening-session-admin";
import { formatDuration } from "@/lib/listening-session-format";
import { parseManualSeconds, type RowsUpdate } from "@/lib/listening-session-admin-set";
import { GradeBadge } from "./ListeningSessionGradeBadge";

interface SetListProps {
  rows: readonly SetRow[];
  /** Tracks whose length the browser could not read, so the admin types it. */
  failed: ReadonlySet<number>;
  onRowsChange: (update: RowsUpdate) => void;
  onRetryMeasure: (trackId: number) => void;
}

interface ManualLengthProps {
  row: SetRow;
  onSet: (seconds: number) => void;
  onRetry: () => void;
}

function ManualLength({ row, onSet, onRetry }: ManualLengthProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const parsed = parseManualSeconds(text);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    onSet(parsed.seconds);
  }

  return (
    <div className="ml-9 space-y-1">
      <p className="text-sm text-amber-700">The browser could not read this track's length. Type it in seconds, or try again.</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={id} className="text-xs">
            Length in seconds for {row.title}
          </Label>
          <Input
            id={id}
            inputMode="numeric"
            className="h-9 w-32"
            value={text}
            aria-invalid={error !== null}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                apply();
              }
            }}
          />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={apply}>
          Use this length
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Measure again
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function focusFirstMatch(root: HTMLElement | null, selectors: readonly string[]) {
  for (const selector of selectors) {
    const element = root?.querySelector<HTMLElement>(selector);
    if (element) {
      element.focus();
      return;
    }
  }
}

export function SetList({ rows, failed, onRowsChange, onRetryMeasure }: SetListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  // Moving a row reorders its element, which drops keyboard focus; this puts it back afterwards.
  const pendingFocus = useRef<readonly string[] | null>(null);

  useEffect(() => {
    const selectors = pendingFocus.current;
    if (!selectors) return;
    pendingFocus.current = null;
    focusFirstMatch(listRef.current, selectors);
  }, [rows]);

  function move(index: number, direction: -1 | 1) {
    const trackId = rows[index].trackId;
    pendingFocus.current = [
      `[data-track-id="${trackId}"] button[data-move="${direction}"]:not(:disabled)`,
      `[data-track-id="${trackId}"] button[data-move="${-direction}"]:not(:disabled)`,
    ];
    onRowsChange((current) => moveTrack(current, index, direction));
  }

  function remove(index: number) {
    const { trackId } = rows[index];
    const neighbour = rows[index + 1] ?? rows[index - 1];
    pendingFocus.current = neighbour ? [`[data-track-id="${neighbour.trackId}"] button[data-action="remove"]`] : null;
    onRowsChange((current) => removeTrack(current, trackId));
  }

  return (
    <ol ref={listRef} className="space-y-2" aria-label="Tracks in the set, in playing order">
      {rows.map((row, index) => {
        const title = row.title || "Untitled track";
        const unknown = row.durationSec === null && failed.has(row.trackId);
        return (
          <li key={row.trackId} data-track-id={row.trackId} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-3">
              <span className="w-6 shrink-0 pt-0.5 text-right text-sm tabular-nums text-slate-500" aria-hidden="true">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{title}</p>
                <p className="truncate text-sm text-slate-600">{row.artistName ?? "Unknown artist"}</p>
              </div>
              <GradeBadge grade={row.grade} />
              <span className="w-16 shrink-0 text-right text-sm tabular-nums text-slate-700">
                {row.durationSec !== null ? (
                  formatDuration(row.durationSec)
                ) : unknown ? (
                  <span className="text-amber-700">Unknown</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Measuring
                  </span>
                )}
              </span>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  data-move={-1}
                  aria-label={`Move ${title} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  data-move={1}
                  aria-label={`Move ${title} down`}
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-red-700 hover:text-red-800"
                  data-action="remove"
                  aria-label={`Remove ${title} from the set`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {!row.available && (
              <p className="ml-9 text-sm text-amber-700">This track is no longer published. Remove it before saving.</p>
            )}
            {unknown && (
              <ManualLength
                row={row}
                onSet={(seconds) => onRowsChange((current) => setRowDuration(current, row.trackId, seconds))}
                onRetry={() => onRetryMeasure(row.trackId)}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

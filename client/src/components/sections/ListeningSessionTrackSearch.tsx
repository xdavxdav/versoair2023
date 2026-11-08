import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check, Loader2, Plus } from "lucide-react";
import type { AdminTrackOption } from "@shared/listening-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { addTrack, rowFromOption, type SetRow } from "@/lib/listening-session-admin";
import { adminApi, adminErrorMessage, adminKeys, searchTerm } from "@/lib/listening-session-admin-api";
import { describeAddFailure, type RowsUpdate } from "@/lib/listening-session-admin-set";
import { GradeBadge } from "./ListeningSessionGradeBadge";

const SEARCH_DEBOUNCE_MS = 300;

interface TrackSearchProps {
  inputId: string;
  rows: readonly SetRow[];
  onRowsChange: (update: RowsUpdate) => void;
}

type Message = { tone: "ok" | "warn"; text: string };

export function TrackSearch({ inputId, rows, onRowsChange }: TrackSearchProps) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const term = useDebouncedValue(searchTerm(query), SEARCH_DEBOUNCE_MS);

  // An empty search lists the newest published tracks.
  const tracks = useQuery({
    queryKey: [...adminKeys.all, "tracks", term],
    queryFn: ({ signal }) => adminApi.searchTracks(term, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  function add(option: AdminTrackOption) {
    const result = addTrack(rows, rowFromOption(option));
    if (!result.ok) {
      setMessage({ tone: "warn", text: describeAddFailure(result.reason, option.title) });
      return;
    }
    onRowsChange(() => result.rows);
    setMessage({ tone: "ok", text: `Added "${option.title}" to the set.` });
  }

  const inSet = new Set(rows.map((row) => row.trackId));

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Search published tracks</Label>
      <div className="relative">
        <Input
          id={inputId}
          type="search"
          autoComplete="off"
          placeholder="Title or artist (empty shows the newest)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {tracks.isFetching && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
        )}
      </div>
      <p
        className={`min-h-5 text-sm ${message?.tone === "warn" ? "text-amber-700" : "text-slate-600"}`}
        role="status"
        aria-live="polite"
      >
        {message?.text}
      </p>
      {tracks.isError ? (
        <p className="text-sm text-red-700" role="alert">
          {adminErrorMessage(tracks.error, "Could not search the tracks.")}
        </p>
      ) : tracks.data && tracks.data.length === 0 ? (
        <p className="text-sm text-slate-600">No published track matches that search.</p>
      ) : (
        tracks.data && (
          <ul
            className="max-h-72 divide-y divide-slate-200 overflow-y-auto rounded-md border border-slate-200 bg-white"
            aria-label="Published tracks"
          >
            {tracks.data.map((track) => (
              <li key={track.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{track.title}</p>
                  <p className="truncate text-xs text-slate-600">{track.artistName ?? "Unknown artist"}</p>
                </div>
                <GradeBadge grade={track.grade} />
                <Button
                  type="button"
                  size="sm"
                  variant={inSet.has(track.id) ? "secondary" : "outline"}
                  aria-label={inSet.has(track.id) ? `${track.title} is already in the set` : `Add ${track.title} to the set`}
                  onClick={() => add(track)}
                >
                  {inSet.has(track.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {inSet.has(track.id) ? "Added" : "Add"}
                </Button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

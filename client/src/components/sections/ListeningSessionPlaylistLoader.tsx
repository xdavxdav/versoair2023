import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ListMusic, Loader2 } from "lucide-react";
import type { AdminPlaylistOption } from "@shared/listening-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/useDebounce";
import type { SetRow } from "@/lib/listening-session-admin";
import { adminApi, adminErrorMessage, adminKeys, searchTerm } from "@/lib/listening-session-admin-api";
import {
  describePlaylistMerge,
  mergePlaylistRows,
  type PlaylistMode,
  type RowsUpdate,
} from "@/lib/listening-session-admin-set";

const SEARCH_DEBOUNCE_MS = 300;

interface PlaylistLoaderProps {
  rows: readonly SetRow[];
  onRowsChange: (update: RowsUpdate) => void;
}

type Message = { tone: "ok" | "warn" | "error"; text: string };

const MESSAGE_TONES: Record<Message["tone"], string> = {
  ok: "text-slate-600",
  warn: "text-amber-700",
  error: "text-red-700",
};

export function PlaylistLoader({ rows, onRowsChange }: PlaylistLoaderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<PlaylistMode>("append");
  const [message, setMessage] = useState<Message | null>(null);
  const term = useDebouncedValue(searchTerm(query), SEARCH_DEBOUNCE_MS);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const playlists = useQuery({
    queryKey: [...adminKeys.all, "playlists", term],
    queryFn: ({ signal }) => adminApi.searchPlaylists(term, signal),
    enabled: open,
    staleTime: 30_000,
  });

  const load = useMutation({
    mutationFn: (job: { playlist: AdminPlaylistOption; mode: PlaylistMode }) => adminApi.playlistTracks(job.playlist.id),
    onSuccess: (tracks, job) => {
      const merge = mergePlaylistRows(rowsRef.current, tracks, job.mode);
      onRowsChange(() => merge.rows);
      setMessage({ tone: merge.added > 0 ? "ok" : "warn", text: describePlaylistMerge(merge, job.mode, job.playlist.name) });
    },
    onError: (error) => setMessage({ tone: "error", text: adminErrorMessage(error, "Could not load the playlist.") }),
  });

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <ListMusic className="h-4 w-4" /> Load from playlist
      </Button>
      <p className={`min-h-5 text-sm ${message ? MESSAGE_TONES[message.tone] : ""}`} role="status" aria-live="polite">
        {message?.text}
      </p>
      {open && (
        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <fieldset className="flex flex-wrap gap-x-6 gap-y-1">
            <legend className="mb-1 text-sm font-medium text-slate-900">When a playlist is loaded</legend>
            {(
              [
                ["append", "Add its tracks to the end of the set"],
                ["replace", "Replace the whole set"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-slate-800">
                <input type="radio" name="playlist-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
                {label}
              </label>
            ))}
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="listening-session-playlist-search">Search playlists</Label>
            <Input
              id="listening-session-playlist-search"
              type="search"
              autoComplete="off"
              placeholder="Playlist name (empty shows yours and the public ones)"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {playlists.isError ? (
            <p className="text-sm text-red-700" role="alert">
              {adminErrorMessage(playlists.error, "Could not search the playlists.")}
            </p>
          ) : playlists.isPending ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading playlists…
            </p>
          ) : playlists.data.length === 0 ? (
            <p className="text-sm text-slate-600">No playlist matches that search.</p>
          ) : (
            <ul className="max-h-60 divide-y divide-slate-200 overflow-y-auto rounded-md border border-slate-200 bg-white" aria-label="Playlists">
              {playlists.data.map((playlist) => (
                <li key={playlist.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{playlist.name}</p>
                    <p className="text-xs text-slate-600">
                      {playlist.trackCount} {playlist.trackCount === 1 ? "track" : "tracks"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === "replace" ? "destructive" : "outline"}
                    disabled={load.isPending}
                    aria-label={`${mode === "replace" ? "Replace the set with" : "Add to the set the tracks of"} ${playlist.name}`}
                    onClick={() => {
                      setMessage(null);
                      load.mutate({ playlist, mode });
                    }}
                  >
                    {load.isPending && load.variables?.playlist.id === playlist.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mode === "replace" ? "Replace set" : "Add tracks"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

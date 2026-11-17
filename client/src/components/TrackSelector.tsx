/**
 * Track Selector — pick tracks for a live session from the host's own published tracks.
 * Only tracks the host owns can be hosted, so there is no cross-catalogue search.
 */

import { useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { useHostTracks, type HostTrack } from "@/hooks/use-create-session";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface TrackSelectorProps {
  selectedTracks: number[];
  onTracksChange: (trackIds: number[]) => void;
  maxTracks?: number;
}

const formatLength = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function TrackSelector({ selectedTracks, onTracksChange, maxTracks = 50 }: TrackSelectorProps) {
  const [query, setQuery] = useState("");
  // Titles of everything seen so far, so a chosen track keeps its name when the search changes.
  const [known, setKnown] = useState<Record<number, HostTrack>>({});
  const { data, isLoading, error } = useHostTracks(query.trim());
  const tracks = data?.tracks ?? [];

  const toggleTrack = (track: HostTrack) => {
    setKnown((current) => ({ ...current, [track.id]: track }));
    if (selectedTracks.includes(track.id)) {
      onTracksChange(selectedTracks.filter((id) => id !== track.id));
    } else if (selectedTracks.length < maxTracks) {
      onTracksChange([...selectedTracks, track.id]);
    }
  };

  const removeTrack = (trackId: number) => onTracksChange(selectedTracks.filter((id) => id !== trackId));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-white/40" />
        <Input
          placeholder="Filter your tracks by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 bg-verso-navy/50 border-verso-navy text-white placeholder:text-white/40"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-center py-6 text-red-300 text-sm">
          {error instanceof Error ? error.message : "Could not load your tracks."}
        </div>
      )}

      {!isLoading && !error && tracks.length === 0 && (
        <div className="text-center py-8 text-white/70 text-sm">
          {query.trim()
            ? "None of your published tracks match."
            : "You have no published tracks yet. Upload a track first, then you can put it in a live session."}
        </div>
      )}

      {tracks.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tracks.map((track) => (
            <label
              key={track.id}
              className="flex items-center gap-3 p-3 bg-verso-navy/50 rounded-lg hover:bg-verso-navy/70 transition cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedTracks.includes(track.id)}
                onChange={() => toggleTrack(track)}
                className="w-4 h-4 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{track.title}</p>
                {track.artistName && <p className="text-white/70 text-sm truncate">{track.artistName}</p>}
              </div>
              <span className="text-white/60 text-sm whitespace-nowrap">{formatLength(track.durationSec)}</span>
            </label>
          ))}
        </div>
      )}

      {selectedTracks.length > 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-amber-300 font-semibold text-sm mb-2">
            {selectedTracks.length} track{selectedTracks.length !== 1 ? "s" : ""} selected (max {maxTracks})
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedTracks.map((trackId) => (
              <Badge
                key={trackId}
                variant="secondary"
                className="bg-amber-500/20 text-amber-200 border-amber-500/30"
              >
                {known[trackId]?.title ?? `Track #${trackId}`}
                <Trash2
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-amber-400"
                  onClick={() => removeTrack(trackId)}
                />
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        tracks.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
            <p className="text-white/70 text-sm">Tick the tracks to play in your session.</p>
          </div>
        )
      )}
    </div>
  );
}

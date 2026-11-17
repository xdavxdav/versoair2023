/**
 * Track Selector — Component for selecting tracks to include in a live session
 * Allows searching and browsing user's playlists and tracks
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Loader2, Play, Trash2, Plus } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Track {
  id: number;
  title: string;
  artist?: string;
  duration?: number;
}

interface TrackSelectorProps {
  selectedTracks: number[];
  onTracksChange: (trackIds: number[]) => void;
  maxTracks?: number;
}

export function TrackSelector({
  selectedTracks,
  onTracksChange,
  maxTracks = 50,
}: TrackSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"search" | "playlists">("search");

  // Search tracks
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["track-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { tracks: [] };
      const res = await authenticatedFetch(
        `/api/listening-sessions/tracks?q=${encodeURIComponent(searchQuery)}&limit=20`
      );
      if (!res.ok) throw new Error("Failed to search tracks");
      return res.json();
    },
    enabled: searchMode === "search" && searchQuery.length > 0,
  });

  // Fetch user playlists
  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ["user-playlists"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/account/playlists");
      if (!res.ok) throw new Error("Failed to load playlists");
      return res.json();
    },
    enabled: searchMode === "playlists",
  });

  const toggleTrack = (trackId: number) => {
    if (selectedTracks.includes(trackId)) {
      onTracksChange(selectedTracks.filter((id) => id !== trackId));
    } else if (selectedTracks.length < maxTracks) {
      onTracksChange([...selectedTracks, trackId]);
    }
  };

  const tracks = searchResults?.tracks || [];
  const isLoading = searchLoading || playlistsLoading;

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSearchMode("search")}
          className={`flex-1 py-2 px-3 rounded-lg transition ${
            searchMode === "search"
              ? "bg-amber-500 text-verso-navy font-semibold"
              : "bg-verso-navy/50 text-white/70 hover:bg-verso-navy/60"
          }`}
        >
          Search Tracks
        </button>
        <button
          onClick={() => setSearchMode("playlists")}
          className={`flex-1 py-2 px-3 rounded-lg transition ${
            searchMode === "playlists"
              ? "bg-amber-500 text-verso-navy font-semibold"
              : "bg-verso-navy/50 text-white/70 hover:bg-verso-navy/60"
          }`}
        >
          My Playlists
        </button>
      </div>

      {/* Search Mode */}
      {searchMode === "search" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search for tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-verso-navy/50 border-verso-navy text-white placeholder:text-white/40"
            />
          </div>

          {searchLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            </div>
          )}

          {!searchLoading && tracks.length === 0 && searchQuery && (
            <div className="text-center py-8 text-white/60">
              No tracks found. Try another search.
            </div>
          )}

          {!searchLoading && tracks.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tracks.map((track: Track) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 bg-verso-navy/50 rounded-lg hover:bg-verso-navy/70 transition group cursor-pointer"
                  onClick={() => toggleTrack(track.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedTracks.includes(track.id)}
                    onChange={() => toggleTrack(track.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.title}</p>
                    {track.artist && (
                      <p className="text-white/60 text-sm truncate">{track.artist}</p>
                    )}
                  </div>
                  {track.duration && (
                    <span className="text-white/40 text-sm whitespace-nowrap">
                      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, "0")}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlists Mode */}
      {searchMode === "playlists" && (
        <div className="space-y-3">
          {playlistsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            </div>
          )}

          {!playlistsLoading && (!playlistsData?.playlists || playlistsData.playlists.length === 0) && (
            <div className="text-center py-8 text-white/60">
              No playlists yet. Create a playlist to get started!
            </div>
          )}

          {!playlistsLoading && playlistsData?.playlists && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {playlistsData.playlists.map((playlist: any) => (
                <div
                  key={playlist.id}
                  className="p-3 bg-verso-navy/50 rounded-lg hover:bg-verso-navy/70 transition"
                >
                  <p className="text-white font-medium mb-2">{playlist.name}</p>
                  <p className="text-white/60 text-sm mb-3">
                    {playlist.trackCount || 0} tracks
                  </p>
                  {playlist.tracks && playlist.tracks.length > 0 && (
                    <div className="space-y-1">
                      {playlist.tracks.map((track: Track) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-2 p-2 bg-verso-navy/30 rounded text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTracks.includes(track.id)}
                            onChange={() => toggleTrack(track.id)}
                            className="w-3 h-3 cursor-pointer"
                          />
                          <span className="text-white/80 flex-1 truncate">
                            {track.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Tracks Summary */}
      {selectedTracks.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-amber-500 font-semibold text-sm mb-2">
            {selectedTracks.length} track{selectedTracks.length !== 1 ? "s" : ""} selected
            {maxTracks && ` (max ${maxTracks})`}
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedTracks.map((trackId) => (
              <Badge
                key={trackId}
                variant="secondary"
                className="bg-amber-500/20 text-amber-400 border-amber-500/30"
              >
                Track #{trackId}
                <Trash2
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-amber-500"
                  onClick={() => toggleTrack(trackId)}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {selectedTracks.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
          <p className="text-white/60 text-sm">
            {searchMode === "search"
              ? "Search and select tracks to include in your session"
              : "Browse your playlists and select tracks"}
          </p>
        </div>
      )}
    </div>
  );
}

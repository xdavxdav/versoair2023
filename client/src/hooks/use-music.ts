import { useQuery } from "@tanstack/react-query";
import type { MusicArtist, MusicTrack, MusicAnalytics } from "@shared/schema";

// GET all music artists
export function useMusicArtists() {
  return useQuery({
    queryKey: ["music", "artists"],
    queryFn: async () => {
      const response = await fetch("/api/music/artists");
      if (!response.ok) throw new Error("Failed to fetch music artists");
      const data = await response.json();
      return data.data as MusicArtist[];
    },
  });
}

// GET all music tracks
export function useMusicTracks() {
  return useQuery({
    queryKey: ["music", "tracks"],
    queryFn: async () => {
      const response = await fetch("/api/music/tracks");
      if (!response.ok) throw new Error("Failed to fetch music tracks");
      const data = await response.json();
      return data.data as MusicTrack[];
    },
  });
}

// GET music analytics
export function useMusicAnalytics() {
  return useQuery({
    queryKey: ["music", "analytics"],
    queryFn: async () => {
      const response = await fetch("/api/music/analytics");
      if (!response.ok) throw new Error("Failed to fetch music analytics");
      const data = await response.json();
      return data.data as MusicAnalytics;
    },
  });
}

// GET single artist with tracks
export function useMusicArtist(id: number) {
  return useQuery({
    queryKey: ["music", "artists", id],
    queryFn: async () => {
      const response = await fetch(`/api/music/artists/${id}`);
      if (!response.ok) throw new Error("Failed to fetch artist");
      const data = await response.json();
      return data.data as MusicArtist & { tracks: MusicTrack[] };
    },
    enabled: !!id,
  });
}

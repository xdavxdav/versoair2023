import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MusicArtist, MusicTrack, MusicAnalytics } from "@shared/schema";
import { authenticatedFetch, getAuthToken } from "@/lib/auth";

// GET all music artists (optionally filtered by country)
export function useMusicArtists(countryCode?: string) {
  return useQuery({
    queryKey: ["music", "artists", countryCode ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (countryCode) params.set("countryCode", countryCode);
      const response = await fetch(`/api/music/artists?${params}`, {
        credentials: "include",
      });
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
      const response = await fetch("/api/music/tracks", {
        credentials: "include",
      });
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
      const response = await fetch("/api/music/analytics", {
        credentials: "include",
      });
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
      const response = await fetch(`/api/music/artists/${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch artist");
      const data = await response.json();
      return data.data as MusicArtist & { tracks: MusicTrack[] };
    },
    enabled: !!id,
  });
}

// GET music earnings summary (for vault/card settings)
export function useMusicEarnings() {
  return useQuery({
    queryKey: ["music", "earnings"],
    queryFn: async () => {
      const response = await fetch("/api/music/earnings", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch music earnings");
      const data = await response.json();
      return data.data as {
        summary: {
          total_tracks: number;
          total_downloads: number;
          total_streams: number;
          total_revenue: string;
          revenue_this_month: string;
          revenue_today: string;
        };
        tracks: any[];
      };
    },
  });
}

// GET current user's artist profile (linked via user_id)
export function useMyArtist() {
  return useQuery({
    queryKey: ["music", "my-artist"],
    queryFn: async () => {
      const response = await authenticatedFetch("/api/music/my-artist");
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch artist profile");
      }
      const data = await response.json();
      return data.data as {
        id: number;
        stageName: string;
        genre: string;
      } | null;
    },
    retry: false,
  });
}

// Upload a track (with auth + CSRF)
export async function uploadTrack(formData: FormData): Promise<any> {
  const { getCsrfToken, initializeCsrfToken } = await import("@/lib/auth");
  let csrf = getCsrfToken();
  if (!csrf) {
    await initializeCsrfToken();
    csrf = getCsrfToken();
  }

  const headers: Record<string, string> = {};
  if (csrf) headers["x-csrf-token"] = csrf;
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch("/api/music/tracks/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `Upload failed (${response.status})`);
  }
  return response.json();
}

// Delete a track (with auth + CSRF)
export async function deleteTrack(id: number): Promise<void> {
  const response = await authenticatedFetch(`/api/music/tracks/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete track");
}

// Update track monetization (with auth + CSRF)
export async function updateTrackMonetization(
  id: number,
  data: { price?: string; revenue?: string; downloads?: number },
): Promise<any> {
  const response = await authenticatedFetch(
    `/api/music/tracks/${id}/monetization`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) throw new Error("Failed to update monetization");
  return response.json();
}

// Hook to invalidate track queries (call after upload/delete)
export function useInvalidateTracks() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["music", "tracks"] });
    queryClient.invalidateQueries({ queryKey: ["music", "earnings"] });
    queryClient.invalidateQueries({ queryKey: ["music", "analytics"] });
    queryClient.invalidateQueries({ queryKey: ["music", "my-artist"] });
    queryClient.invalidateQueries({ queryKey: ["music", "albums"] });
    queryClient.invalidateQueries({ queryKey: ["music", "collaborations"] });
  };
}

// ═══════════════════════════════════════════════════════════════════
// ALBUM hooks
// ═══════════════════════════════════════════════════════════════════

export function useMusicAlbums(artistId?: number) {
  return useQuery({
    queryKey: ["music", "albums", artistId ?? "all"],
    queryFn: async () => {
      const params = artistId ? `?artist_id=${artistId}` : "";
      const response = await fetch(`/api/music/albums${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch albums");
      const data = await response.json();
      return data.data as any[];
    },
  });
}

export async function createAlbum(payload: {
  title: string;
  genre?: string;
  description?: string;
  albumType?: string;
  trackIds?: number[];
}): Promise<any> {
  const response = await authenticatedFetch("/api/music/albums", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to create album");
  }
  return response.json();
}

export async function deleteAlbum(id: number): Promise<void> {
  const response = await authenticatedFetch(`/api/music/albums/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete album");
}

// ═══════════════════════════════════════════════════════════════════
// COLLABORATION hooks
// ═══════════════════════════════════════════════════════════════════

export function useCollaborations() {
  return useQuery({
    queryKey: ["music", "collaborations"],
    queryFn: async () => {
      const response = await authenticatedFetch("/api/music/collaborations");
      if (!response.ok) throw new Error("Failed to fetch collabs");
      const data = await response.json();
      return data.data as any[];
    },
  });
}

export async function sendCollabRequest(payload: {
  targetId: number;
  trackTitle?: string;
  revenueShare?: number;
  message?: string;
  genre?: string;
}): Promise<any> {
  const response = await authenticatedFetch("/api/music/collaborations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Failed" }));
    throw new Error(err.error || "Failed to send request");
  }
  return response.json();
}

export async function updateCollabStatus(
  id: number,
  status: "active" | "declined" | "completed",
): Promise<any> {
  const response = await authenticatedFetch(
    `/api/music/collaborations/${id}/status`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!response.ok) throw new Error("Failed to update collab status");
  return response.json();
}

// Search artists by name/genre
export function useArtistSearch(q: string, genre?: string) {
  return useQuery({
    queryKey: ["music", "artists", "search", q, genre ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (genre && genre !== "all") params.set("genre", genre);
      const response = await fetch(`/api/music/artists/search?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to search artists");
      const data = await response.json();
      return data.data as any[];
    },
    enabled: q.length >= 1,
  });
}

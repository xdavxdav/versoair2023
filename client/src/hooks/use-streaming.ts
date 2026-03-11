/**
 * Verso Air Streaming — React Query hooks for all streaming API calls
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "/api/streaming";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function postJson(url: string, body?: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════
// TRACKS
// ═══════════════════════════════════════════════════════════

export function useStreamingTracks(filters?: {
  genre?: string;
  mood?: string;
  artist?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.genre) params.set("genre", filters.genre);
  if (filters?.mood) params.set("mood", filters.mood);
  if (filters?.artist) params.set("artist", filters.artist);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sort) params.set("sort", filters.sort);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["streaming-tracks", filters],
    queryFn: () => fetchJson(`${BASE}/tracks?${params.toString()}`),
    staleTime: 60_000,
  });
}

export function useFeaturedTracks() {
  return useQuery({
    queryKey: ["streaming-featured"],
    queryFn: () => fetchJson(`${BASE}/tracks/featured`),
    staleTime: 120_000,
  });
}

export function useTrackDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ["streaming-track", id],
    queryFn: () => fetchJson(`${BASE}/tracks/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════
// ARTISTS
// ═══════════════════════════════════════════════════════════

export function useStreamingArtists(filters?: {
  search?: string;
  genre?: string;
  country?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.genre) params.set("genre", filters.genre);
  if (filters?.country) params.set("country", filters.country);
  if (filters?.sort) params.set("sort", filters.sort);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  return useQuery({
    queryKey: ["streaming-artists", filters],
    queryFn: () => fetchJson(`${BASE}/artists?${params.toString()}`),
    staleTime: 60_000,
  });
}

export function useArtistDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ["streaming-artist", id],
    queryFn: () => fetchJson(`${BASE}/artists/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════
// ALBUMS
// ═══════════════════════════════════════════════════════════

export function useAlbumDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ["streaming-album", id],
    queryFn: () => fetchJson(`${BASE}/albums/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════
// PLAYLISTS
// ═══════════════════════════════════════════════════════════

export function usePlaylists() {
  return useQuery({
    queryKey: ["streaming-playlists"],
    queryFn: () => fetchJson(`${BASE}/playlists`),
    staleTime: 30_000,
  });
}

export function usePlaylistDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ["streaming-playlist", id],
    queryFn: () => fetchJson(`${BASE}/playlists/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      isPublic?: boolean;
    }) => postJson(`${BASE}/playlists`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["streaming-playlists"] }),
  });
}

export function useAddToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      playlistId,
      trackId,
    }: {
      playlistId: number;
      trackId: number;
    }) => postJson(`${BASE}/playlists/${playlistId}/tracks`, { trackId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["streaming-playlist", vars.playlistId],
      });
      qc.invalidateQueries({ queryKey: ["streaming-playlists"] });
    },
  });
}

export function useReorderPlaylist() {
  return useMutation({
    mutationFn: ({
      playlistId,
      trackIds,
    }: {
      playlistId: number;
      trackIds: number[];
    }) =>
      fetch(`${BASE}/playlists/${playlistId}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds }),
      }).then((r) => r.json()),
  });
}

// ═══════════════════════════════════════════════════════════
// SOCIAL
// ═══════════════════════════════════════════════════════════

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackId: number) => postJson(`${BASE}/like`, { trackId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streaming-tracks"] });
      qc.invalidateQueries({ queryKey: ["streaming-liked"] });
      qc.invalidateQueries({ queryKey: ["user-liked-tracks"] });
    },
  });
}

export function useLikedTracks() {
  return useQuery({
    queryKey: ["streaming-liked"],
    queryFn: () => fetchJson(`${BASE}/liked`),
    staleTime: 30_000,
  });
}

export function useUserLikedTrackIds() {
  return useQuery({
    queryKey: ["user-liked-tracks"],
    queryFn: () => fetchJson(`${BASE}/user/liked-tracks`),
    staleTime: 30_000,
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (artistId: number) => postJson(`${BASE}/follow`, { artistId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["streaming-artists"] });
      qc.invalidateQueries({ queryKey: ["user-following"] });
    },
  });
}

export function useUserFollowing() {
  return useQuery({
    queryKey: ["user-following"],
    queryFn: () => fetchJson(`${BASE}/user/following`),
    staleTime: 30_000,
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      trackId: number;
      content: string;
      parentId?: number;
    }) => postJson(`${BASE}/comment`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["streaming-track", vars.trackId] });
    },
  });
}

// ═══════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════

export function useListeningHistory() {
  return useQuery({
    queryKey: ["streaming-history"],
    queryFn: () => fetchJson(`${BASE}/history`),
    staleTime: 30_000,
  });
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════

export function useStreamingAnalytics() {
  return useQuery({
    queryKey: ["streaming-analytics"],
    queryFn: () => fetchJson(`${BASE}/analytics/overview`),
    staleTime: 120_000,
  });
}

export function useArtistAnalytics(artistId: number | string | undefined) {
  return useQuery({
    queryKey: ["streaming-artist-analytics", artistId],
    queryFn: () => fetchJson(`${BASE}/analytics/artist/${artistId}`),
    enabled: !!artistId,
    staleTime: 120_000,
  });
}

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["streaming-plans"],
    queryFn: () => fetchJson(`${BASE}/subscription/plans`),
    staleTime: 300_000,
  });
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["streaming-subscription"],
    queryFn: () => fetchJson(`${BASE}/subscription/status`),
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════

export function useStreamingSearch(query: string) {
  return useQuery({
    queryKey: ["streaming-search", query],
    queryFn: () => fetchJson(`${BASE}/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

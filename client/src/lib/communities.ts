/**
 * Shared types, helpers, and REST client for VXPP Communities (/api/vxpp-communities).
 */
import { authenticatedFetch } from "@/lib/auth";

export const COMMUNITY_CATEGORIES = [
  "Trades",
  "Careers",
  "Local",
  "Business",
  "Creative",
  "General",
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const COMMUNITY_MARKS = ["◇", "▲", "◎", "⬢", "◈", "✦", "❖", "▣"] as const;

export interface VxppCommunity {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  emoji: string;
  created_by: number | null;
  created_date: string;
}

export interface VxppCommunityMember {
  id: number;
  community_id: number;
  created_by: number;
  user_name: string;
  created_date: string;
}

export interface VxppCommunityPost {
  id: number;
  community_id: number;
  created_by: number;
  author_name: string;
  body: string;
  image_url: string;
  created_date: string;
}

export interface VxppCommunityComment {
  id: number;
  post_id: number;
  community_id: number;
  created_by: number;
  author_name: string;
  body: string;
  created_date: string;
}

export interface CommunitiesListResponse {
  success: boolean;
  items: VxppCommunity[];
  memberCounts: Record<string, number>;
  postCounts: Record<string, number>;
  myCommunityIds: number[];
}

export interface CommunityDetailResponse {
  success: boolean;
  community: VxppCommunity;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  posts: VxppCommunityPost[];
  commentCounts: Record<string, number>;
  likeCounts: Record<string, number>;
  likedPostIds: number[];
}

export function slugifyCommunityName(input: string): string {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function relTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const ts = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  if (!Number.isFinite(ts)) return "";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function memberInitials(name: string | null | undefined): string {
  const clean = String(name || "").trim();
  if (!clean) return "V";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "V";
}

async function parseJson<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }
  return payload as T;
}

export async function listVxppCommunities(params?: {
  q?: string;
  category?: string;
}): Promise<CommunitiesListResponse> {
  const qs = new URLSearchParams();
  if (params?.q?.trim()) qs.set("q", params.q.trim());
  if (params?.category && params.category !== "All") qs.set("category", params.category);
  const query = qs.toString();
  const res = await fetch(`/api/vxpp-communities${query ? `?${query}` : ""}`, {
    credentials: "include",
  });
  return parseJson<CommunitiesListResponse>(res);
}

export async function getVxppCommunityBySlug(slug: string): Promise<CommunityDetailResponse> {
  const res = await fetch(`/api/vxpp-communities/${encodeURIComponent(slug)}`, {
    credentials: "include",
  });
  return parseJson<CommunityDetailResponse>(res);
}

export async function createVxppCommunity(input: {
  name: string;
  slug?: string;
  tagline?: string;
  description?: string;
  category: string;
  emoji: string;
}): Promise<{ success: boolean; community: VxppCommunity }> {
  const res = await authenticatedFetch("/api/vxpp-communities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<{ success: boolean; community: VxppCommunity }>(res);
}

export async function joinVxppCommunity(
  communityId: number,
): Promise<{ success: boolean; joined: boolean; memberCount: number }> {
  const res = await authenticatedFetch(`/api/vxpp-communities/${communityId}/membership`, {
    method: "POST",
  });
  return parseJson<{ success: boolean; joined: boolean; memberCount: number }>(res);
}

export async function leaveVxppCommunity(
  communityId: number,
): Promise<{ success: boolean; joined: boolean; memberCount: number }> {
  const res = await authenticatedFetch(`/api/vxpp-communities/${communityId}/membership`, {
    method: "DELETE",
  });
  return parseJson<{ success: boolean; joined: boolean; memberCount: number }>(res);
}

export async function createVxppCommunityPost(
  communityId: number,
  input: { body: string; image_url?: string },
): Promise<{ success: boolean; post: VxppCommunityPost }> {
  const res = await authenticatedFetch(`/api/vxpp-communities/${communityId}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<{ success: boolean; post: VxppCommunityPost }>(res);
}

export async function deleteVxppCommunityPost(postId: number): Promise<{ success: boolean }> {
  const res = await authenticatedFetch(`/api/vxpp-communities/posts/${postId}`, {
    method: "DELETE",
  });
  return parseJson<{ success: boolean }>(res);
}

export async function listVxppPostComments(
  postId: number,
): Promise<{ success: boolean; comments: VxppCommunityComment[] }> {
  const res = await fetch(`/api/vxpp-communities/posts/${postId}/comments`, {
    credentials: "include",
  });
  return parseJson<{ success: boolean; comments: VxppCommunityComment[] }>(res);
}

export async function createVxppPostComment(
  postId: number,
  body: string,
): Promise<{ success: boolean; comment: VxppCommunityComment }> {
  const res = await authenticatedFetch(`/api/vxpp-communities/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return parseJson<{ success: boolean; comment: VxppCommunityComment }>(res);
}

export async function likeVxppCommunityPost(
  postId: number,
): Promise<{ success: boolean; liked: boolean; likeCount: number }> {
  const res = await authenticatedFetch(`/api/vxpp-communities/posts/${postId}/like`, {
    method: "POST",
  });
  return parseJson<{ success: boolean; liked: boolean; likeCount: number }>(res);
}

export async function unlikeVxppCommunityPost(
  postId: number,
): Promise<{ success: boolean; liked: boolean; likeCount: number }> {
  const res = await authenticatedFetch(`/api/vxpp-communities/posts/${postId}/like`, {
    method: "DELETE",
  });
  return parseJson<{ success: boolean; liked: boolean; likeCount: number }>(res);
}

export async function uploadCommunityPostPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await authenticatedFetch("/api/profile/post-media", {
    method: "POST",
    body: form,
  });
  const data = await parseJson<{ success: boolean; url: string }>(res);
  if (!data.url) throw new Error("Upload did not return a photo URL.");
  return data.url;
}

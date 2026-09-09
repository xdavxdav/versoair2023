import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, Users, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CommunityRecord {
  id: number;
  name: string;
  region: string;
  category: string;
  focus: string;
  status: string;
  member_count: number;
  pending_requests: number;
  owner_name?: string | null;
}

interface JoinRequest {
  id: number;
  community_id: number;
  community_name: string;
  applicant_name: string;
  applicant_email: string;
  message?: string | null;
  created_at: string;
}

interface CommunityPost {
  id: number;
  content: string;
  is_hidden: boolean;
  created_at: string;
  author_name?: string | null;
  community_name?: string | null;
}

const STATUS_OPTIONS = [
  "ALL",
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "SUSPENDED",
  "ARCHIVED",
];

export function CommunityOperationsSection() {
  const [communities, setCommunities] = useState<CommunityRecord[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const query = status === "ALL" ? "" : `?status=${status}`;
      const [communityResponse, requestResponse, postsResponse] =
        await Promise.all([
          authenticatedFetch(`/api/v1/admin/communities${query}`),
          authenticatedFetch("/api/v1/admin/communities/join-requests"),
          authenticatedFetch("/api/v1/admin/communities/posts"),
        ]);
      const communityData = await communityResponse.json();
      const requestData = await requestResponse.json();
      const postsData = await postsResponse.json();
      if (!communityResponse.ok)
        throw new Error(communityData.error || "Failed to load communities");
      if (!requestResponse.ok)
        throw new Error(requestData.error || "Failed to load join requests");
      if (!postsResponse.ok)
        throw new Error(postsData.error || "Failed to load community posts");
      setCommunities(communityData.data || []);
      setRequests(requestData.data || []);
      setPosts(postsData.data || []);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load Community operations",
      );
    } finally {
      setLoading(false);
    }
  };

  const moderatePost = async (
    id: number,
    action: "hide" | "unhide" | "remove",
  ) => {
    const reason = window.prompt("Moderation reason:");
    if (!reason?.trim()) return;
    setBusyKey(`post-${id}`);
    try {
      const response = await authenticatedFetch(
        `/api/v1/admin/communities/posts/${id}/moderation`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to moderate post");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to moderate post",
      );
    } finally {
      setBusyKey(null);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const updateCommunityStatus = async (id: number, nextStatus: string) => {
    setBusyKey(`community-${id}`);
    try {
      const response = await authenticatedFetch(
        `/api/v1/admin/communities/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to update community");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update community",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const updateRequestStatus = async (
    id: number,
    nextStatus: "APPROVED" | "REJECTED",
  ) => {
    setBusyKey(`request-${id}`);
    try {
      const response = await authenticatedFetch(
        `/api/v1/admin/communities/join-requests/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to update join request");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update join request",
      );
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Users className="h-5 w-5 text-emerald-600" /> Community
              Operations
            </CardTitle>
            <CardDescription>
              Manage publication status and review membership requests.
            </CardDescription>
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            aria-label="Filter communities by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {message && (
            <p className="mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              {message}
            </p>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
              operations...
            </div>
          ) : communities.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No communities match this status.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {communities.map((community) => (
                <div
                  key={community.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {community.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {community.region} · {community.category}
                      </p>
                    </div>
                    <Badge variant="outline">{community.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {community.focus}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{community.member_count} members</span>
                    <span>{community.pending_requests} pending requests</span>
                    {community.owner_name && (
                      <span>Owner: {community.owner_name}</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <select
                      value={community.status}
                      disabled={busyKey === `community-${community.id}`}
                      onChange={(event) =>
                        void updateCommunityStatus(
                          community.id,
                          event.target.value,
                        )
                      }
                      className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                      aria-label={`Status for ${community.name}`}
                    >
                      {STATUS_OPTIONS.slice(1).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-900">
            Pending Join Requests
          </CardTitle>
          <CardDescription>
            Approve or reject requests submitted by Community members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">
              No pending join requests.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {request.applicant_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {request.applicant_email} · {request.community_name}
                    </p>
                    {request.message && (
                      <p className="mt-1 text-sm text-slate-600">
                        {request.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={busyKey === `request-${request.id}`}
                      onClick={() =>
                        void updateRequestStatus(request.id, "APPROVED")
                      }
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyKey === `request-${request.id}`}
                      onClick={() =>
                        void updateRequestStatus(request.id, "REJECTED")
                      }
                    >
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-900">
            Community Post Moderation
          </CardTitle>
          <CardDescription>
            Hide, restore, or remove posts with an auditable reason.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {posts.length === 0 ? (
            <p className="text-sm text-slate-500">No community posts found.</p>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{post.content}</p>
                  <p className="text-xs text-slate-500">
                    {post.author_name || "Unknown"} ·{" "}
                    {post.community_name || "Community"} ·{" "}
                    {post.is_hidden ? "Hidden" : "Visible"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyKey === `post-${post.id}`}
                    onClick={() =>
                      void moderatePost(
                        post.id,
                        post.is_hidden ? "unhide" : "hide",
                      )
                    }
                  >
                    {post.is_hidden ? "Restore" : "Hide"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyKey === `post-${post.id}`}
                    onClick={() => void moderatePost(post.id, "remove")}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

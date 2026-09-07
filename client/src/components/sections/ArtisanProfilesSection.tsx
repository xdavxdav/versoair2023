import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface ArtisanProfile {
  id: number;
  name: string;
  displayName?: string | null;
  category?: string | null;
  status: string;
  verificationStatus?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  approvalNotes?: string | null;
}

const STATUS_OPTIONS = [
  "ALL",
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "SUSPENDED",
];

export function ArtisanProfilesSection() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("PENDING");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const profilesQuery = useQuery({
    queryKey: ["admin-artisan-profiles", status],
    queryFn: async () => {
      const params = new URLSearchParams({ accountType: "artisan" });
      if (status !== "ALL") params.set("status", status);
      const response = await authenticatedFetch(
        `/api/admin/profiles?${params.toString()}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to load artisan profiles");
      return (data.data || []) as ArtisanProfile[];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: number;
      action: "approve" | "reject" | "suspend" | "restore";
    }) => {
      const response = await authenticatedFetch(
        `/api/admin/profiles/${id}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes: notes[id] || undefined }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Profile action failed");
      return data;
    },
    onSuccess: () => {
      setMessage("Profile updated.");
      void queryClient.invalidateQueries({
        queryKey: ["admin-artisan-profiles"],
      });
    },
    onError: (error) =>
      setMessage(
        error instanceof Error ? error.message : "Profile action failed",
      ),
  });

  const profiles = profilesQuery.data || [];

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5 text-amber-600" /> Artisan Profiles
          </CardTitle>
          <CardDescription>
            Review profiles before they become publicly visible.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            aria-label="Filter artisan profiles"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void profilesQuery.refetch()}
            aria-label="Refresh artisan profiles"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {message && (
          <p className="mb-4 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
            {message}
          </p>
        )}
        {profilesQuery.isLoading ? (
          <div className="flex justify-center py-10 text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
            profiles...
          </div>
        ) : profilesQuery.isError ? (
          <p className="rounded-md bg-rose-50 p-4 text-sm text-rose-700">
            {profilesQuery.error instanceof Error
              ? profilesQuery.error.message
              : "Failed to load profiles"}
          </p>
        ) : profiles.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No artisan profiles match this status.
          </p>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {profile.displayName || profile.name}
                      </h3>
                      <Badge variant="outline">{profile.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {profile.category || "Uncategorized"}
                      {profile.ownerEmail ? ` · ${profile.ownerEmail}` : ""}
                    </p>
                    {profile.approvalNotes && (
                      <p className="mt-2 text-sm text-slate-600">
                        Previous note: {profile.approvalNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profile.status === "PENDING" ||
                      profile.status === "SUSPENDED") && (
                      <Button
                        size="sm"
                        onClick={() =>
                          actionMutation.mutate({
                            id: profile.id,
                            action: "approve",
                          })
                        }
                        disabled={actionMutation.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                    )}
                    {profile.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          actionMutation.mutate({
                            id: profile.id,
                            action: "reject",
                          })
                        }
                        disabled={actionMutation.isPending}
                      >
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    )}
                    {profile.status === "PUBLISHED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          actionMutation.mutate({
                            id: profile.id,
                            action: "suspend",
                          })
                        }
                        disabled={actionMutation.isPending}
                      >
                        <ShieldAlert className="mr-1 h-4 w-4" /> Suspend
                      </Button>
                    )}
                    {profile.status === "SUSPENDED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          actionMutation.mutate({
                            id: profile.id,
                            action: "restore",
                          })
                        }
                        disabled={actionMutation.isPending}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
                <Textarea
                  className="mt-3"
                  value={notes[profile.id] || ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [profile.id]: event.target.value,
                    }))
                  }
                  placeholder="Reviewer note"
                  aria-label={`Reviewer note for ${profile.name}`}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedFetch } from "@/lib/auth";

interface BusinessClaimReview {
  id: number;
  business_id: number;
  user_id: number;
  status: string;
  message: string | null;
  claimant_role: string;
  work_email: string | null;
  work_phone: string | null;
  evidence: {
    emailMatchesListed?: boolean;
    emailDomainMatchesWebsite?: boolean;
    phoneMatchesListed?: boolean;
  };
  review_note: string | null;
  created_at: string;
  business_name: string;
  listed_email: string | null;
  listed_phone: string | null;
  listed_website: string | null;
  claimant_account_email: string;
  claimant_business_name: string | null;
}

interface BusinessClaimsResponse {
  data: BusinessClaimReview[];
  pagination: { page: number; limit: number; total: number };
}

async function loadClaims(page: number): Promise<BusinessClaimsResponse> {
  const response = await authenticatedFetch(
    `/api/v1/admin/business-claims?status=pending&page=${page}&limit=25`,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || "Could not load business claims.");
  }
  return body;
}

export function BusinessClaimsSection() {
  const queryClient = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const claimsQuery = useQuery({
    queryKey: ["admin-business-claims", "pending", page],
    queryFn: () => loadClaims(page),
    staleTime: 15_000,
  });

  const review = async (claimId: number, action: "approve" | "reject") => {
    const reviewNote = reviewNotes[claimId]?.trim() || "";
    if (action === "reject" && !reviewNote) {
      setError("Enter a reason before rejecting a claim.");
      return;
    }

    setBusyId(claimId);
    setError("");
    try {
      const response = await authenticatedFetch(
        `/api/v1/admin/business-claims/${claimId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reviewNote: reviewNote || undefined }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        throw new Error(body?.error || "Could not review this claim.");
      }
      await queryClient.invalidateQueries({
        queryKey: ["admin-business-claims"],
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not review this claim.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Business claims</h1>
          <p className="mt-1 text-sm text-slate-600">
            Verify authority before approval. Evidence flags prioritize review only; they never approve a claim automatically.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void claimsQuery.refetch()}
          disabled={claimsQuery.isFetching}
        >
          {claimsQuery.isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </header>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      {claimsQuery.isError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
          {claimsQuery.error instanceof Error
            ? claimsQuery.error.message
            : "Could not load business claims."}
        </p>
      )}
      {claimsQuery.isLoading && <p className="text-sm text-slate-600">Loading claims…</p>}
      {claimsQuery.isSuccess && claimsQuery.data.data.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          No pending business claims.
        </div>
      )}

      {claimsQuery.data && claimsQuery.data.pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            {claimsQuery.data.pagination.total} pending claim
            {claimsQuery.data.pagination.total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                page * claimsQuery.data.pagination.limit >=
                claimsQuery.data.pagination.total
              }
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {claimsQuery.data?.data.map((claim) => (
          <article key={claim.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  {claim.business_name} <span className="font-normal text-slate-500">· #{claim.business_id}</span>
                </h2>
                <p className="mt-1 text-sm text-slate-700">
                  Claimant: {claim.claimant_business_name || claim.claimant_account_email}
                  {claim.claimant_business_name ? ` · ${claim.claimant_account_email}` : ""}
                </p>
                <p className="text-sm text-slate-700">Role: {claim.claimant_role}</p>
                <p className="text-sm text-slate-700">
                  Work contact: {claim.work_email || "—"} · {claim.work_phone || "—"}
                </p>
                <p className="text-xs text-slate-500">
                  Submitted {new Date(claim.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {claim.evidence?.emailMatchesListed && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    Matches listed email
                  </span>
                )}
                {claim.evidence?.emailDomainMatchesWebsite && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    Website email domain
                  </span>
                )}
                {claim.evidence?.phoneMatchesListed && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    Matches listed phone
                  </span>
                )}
              </div>
            </div>

            {claim.message && (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {claim.message}
              </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Listed contact: {claim.listed_email || "—"} · {claim.listed_phone || "—"} · {claim.listed_website || "—"}
            </p>

            <label className="mt-4 block space-y-1 text-sm font-medium text-slate-700">
              Review note (required to reject)
              <Textarea
                value={reviewNotes[claim.id] || ""}
                onChange={(event) =>
                  setReviewNotes((current) => ({
                    ...current,
                    [claim.id]: event.target.value,
                  }))
                }
                maxLength={2000}
                rows={2}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void review(claim.id, "approve")}
                disabled={busyId !== null}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                {busyId === claim.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Approve claim
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void review(claim.id, "reject")}
                disabled={busyId !== null || !reviewNotes[claim.id]?.trim()}
              >
                {busyId === claim.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Reject
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

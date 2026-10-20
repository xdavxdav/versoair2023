import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AddonRequest {
  id: number;
  email: string;
  username: string | null;
  base_tier: string;
  market_code: "CA" | "FR" | "CI";
  business_name: string | null;
  business_type: string;
  study_priorities: string[] | null;
  proposed_fee_percent: number | null;
  status: "pending" | "active" | "rejected" | "cancelled" | "expired";
  agreed_annual_amount: string | null;
  agreed_currency: "CAD" | "EUR" | "XOF" | null;
  requested_at: string;
  expires_at: string | null;
  review_notes: string | null;
}

interface RequestResponse {
  requests: AddonRequest[];
}

const MARKET_CURRENCY = {
  CA: "CAD",
  FR: "EUR",
  CI: "XOF",
} as const;

const MARKET_NAME = {
  CA: "Canada",
  FR: "France",
  CI: "Côte d’Ivoire",
} as const;

export default function GeoAdminAddonRequests() {
  const queryClient = useQueryClient();
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState<number | null>(null);
  const requestsQuery = useQuery<RequestResponse>({
    queryKey: ["/api/geo-admin/addons/requests"],
  });

  const decide = async (
    request: AddonRequest,
    decision: "approve" | "reject" | "revoke",
  ) => {
    setError("");
    const amount = Number(amounts[request.id]);
    if (decision === "approve" && (!Number.isFinite(amount) || amount <= 0)) {
      setError("Enter the agreed annual price before approving.");
      return;
    }
    setWorkingId(request.id);
    try {
      const body =
        decision === "approve"
          ? {
              decision,
              agreedAnnualAmount: amount,
              agreedCurrency: MARKET_CURRENCY[request.market_code],
              reviewNotes: notes[request.id] || undefined,
            }
          : { decision, reviewNotes: notes[request.id] || undefined };
      await apiRequest(
        "PATCH",
        `/api/geo-admin/addons/requests/${request.id}`,
        body,
      );
      await queryClient.invalidateQueries({
        queryKey: ["/api/geo-admin/addons/requests"],
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message.replace(/^\d+:\s*/, "")
          : "Could not update this request. Please retry.",
      );
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold">GeoAdmin add-on requests</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review customer inquiries and enter the agreed annual quote amount.
          Approval activates access for one year; the proposal percentage is
          illustrative, not the final fee.
        </p>
      </div>
      {requestsQuery.isLoading && (
        <Loader2 className="mt-4 h-5 w-5 animate-spin" aria-label="Loading requests" />
      )}
      {requestsQuery.isError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {requestsQuery.error instanceof Error
            ? requestsQuery.error.message
            : "Could not load add-on requests."}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {!requestsQuery.isLoading && !requestsQuery.isError && (
        <div className="mt-4 space-y-4">
          {(requestsQuery.data?.requests ?? []).length === 0 ? (
            <p className="text-sm text-slate-600">No requests yet.</p>
          ) : (
            requestsQuery.data!.requests.map((request) => (
              <article
                key={request.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">
                      {request.business_name || request.username || request.email}
                    </h3>
                    <p className="text-sm text-slate-600">{request.email}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase text-amber-900">
                    {request.status}
                  </span>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="inline font-semibold">Base tier: </dt>
                    <dd className="inline">{request.base_tier}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Target market: </dt>
                    <dd className="inline">{MARKET_NAME[request.market_code]}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Business type: </dt>
                    <dd className="inline">{request.business_type}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Proposal: </dt>
                    <dd className="inline">
                      {request.proposed_fee_percent === null
                        ? "Custom quote"
                        : `${request.proposed_fee_percent}% example`}
                    </dd>
                  </div>
                  {request.expires_at && (
                    <div>
                      <dt className="inline font-semibold">Expires: </dt>
                      <dd className="inline">
                        {new Date(request.expires_at).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
                {!!request.study_priorities?.length && (
                  <p className="mt-2 text-sm text-slate-600">
                    Study priorities: {request.study_priorities.join(", ")}
                  </p>
                )}
                {request.review_notes && (
                  <p className="mt-2 text-sm text-slate-600">
                    Staff notes: {request.review_notes}
                  </p>
                )}
                {(request.status === "pending" || request.status === "active") && (
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    {request.status === "pending" && (
                      <label className="text-sm font-medium">
                        Final annual quote ({MARKET_CURRENCY[request.market_code]})
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={amounts[request.id] ?? ""}
                          onChange={(event) =>
                            setAmounts((previous) => ({
                              ...previous,
                              [request.id]: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </label>
                    )}
                    <label className="text-sm font-medium">
                      Staff notes
                      <input
                        value={notes[request.id] ?? ""}
                        maxLength={2000}
                        onChange={(event) =>
                          setNotes((previous) => ({
                            ...previous,
                            [request.id]: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      {request.status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={workingId === request.id}
                            onClick={() => void decide(request, "approve")}
                            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Approve and activate
                          </button>
                          <button
                            type="button"
                            disabled={workingId === request.id}
                            onClick={() => void decide(request, "reject")}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {request.status === "active" && (
                        <button
                          type="button"
                          disabled={workingId === request.id}
                          onClick={() => void decide(request, "revoke")}
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                        >
                          Revoke access
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}

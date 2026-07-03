import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Check,
  X,
  Search,
  RefreshCw,
  ExternalLink,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";

/**
 * ContractorApplicationsSection — Admin panel for reviewing contractor pool applications.
 * Approve → creates contractor profile + grants portal access.
 * Reject → with notes, applicant can reapply later.
 */
export function ContractorApplicationsSection() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionTarget, setActionTarget] = useState<{
    id: number;
    action: "approve" | "reject";
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [page, setPage] = useState(1);

  // Fetch applications
  const { data: appData, isLoading } = useQuery({
    queryKey: ["contractor-applications", statusFilter, page],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `/api/contractor-pipeline/applications?status=${statusFilter}&page=${page}&limit=20`,
      );
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const applications = appData?.applications || [];
  const total = appData?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // Filtered by search
  const filtered = searchQuery
    ? applications.filter(
        (a: any) =>
          a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.specialization?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : applications;

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await authenticatedFetch(
        `/api/contractor-pipeline/applications/${id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewNotes: notes }),
        },
      );
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setActionTarget(null);
        setReviewNotes("");
        queryClient.invalidateQueries({
          queryKey: ["contractor-applications"],
        });
      } else {
        setFeedback({ type: "error", message: data.message });
      }
    },
    onError: () =>
      setFeedback({ type: "error", message: "Failed to approve application" }),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await authenticatedFetch(
        `/api/contractor-pipeline/applications/${id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewNotes: notes }),
        },
      );
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setActionTarget(null);
        setReviewNotes("");
        queryClient.invalidateQueries({
          queryKey: ["contractor-applications"],
        });
      } else {
        setFeedback({ type: "error", message: data.message });
      }
    },
    onError: () =>
      setFeedback({ type: "error", message: "Failed to reject application" }),
  });

  const handleAction = () => {
    if (!actionTarget) return;
    if (actionTarget.action === "approve") {
      approveMutation.mutate({ id: actionTarget.id, notes: reviewNotes });
    } else {
      rejectMutation.mutate({ id: actionTarget.id, notes: reviewNotes });
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            Contractor Applications
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve contractor pool applications
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {total} total {statusFilter} application{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-current opacity-50 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              statusFilter === s
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or specialization..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Action Modal (inline) */}
      {actionTarget && (
        <div className="bg-white border-2 border-indigo-200 rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-lg mb-2">
            {actionTarget.action === "approve"
              ? "✅ Approve Application"
              : "❌ Reject Application"}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {actionTarget.action === "approve"
              ? "This will create a contractor profile and grant portal access."
              : "Add a reason for rejection. The applicant can reapply later."}
          </p>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={
              actionTarget.action === "approve"
                ? "Optional notes..."
                : "Reason for rejection..."
            }
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${
                actionTarget.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {approveMutation.isPending || rejectMutation.isPending
                ? "Processing..."
                : actionTarget.action === "approve"
                  ? "Approve & Create Profile"
                  : "Reject Application"}
            </button>
            <button
              onClick={() => {
                setActionTarget(null);
                setReviewNotes("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Applications List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading applications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No {statusFilter} applications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app: any) => {
            const isExpanded = expandedId === app.id;
            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Summary Row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{app.name}</p>
                      <p className="text-xs text-gray-500">
                        {app.email || app.user_email} •{" "}
                        {app.specialization || "General"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(app.status)}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium">
                          {app.phone || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Hourly Rate</p>
                        <p className="text-sm font-medium">
                          {app.hourly_rate ? `$${app.hourly_rate}/hr` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tier</p>
                        <p className="text-sm font-medium capitalize">
                          {app.subscription_tier || "free"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Portfolio</p>
                        {app.portfolio_url ? (
                          <a
                            href={app.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </div>
                    </div>

                    {app.cover_letter && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">
                          Cover Letter
                        </p>
                        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">
                          {app.cover_letter}
                        </p>
                      </div>
                    )}

                    {app.reviewer_name && (
                      <div className="mb-4 text-xs text-gray-500">
                        Reviewed by{" "}
                        <span className="font-medium text-gray-700">
                          {app.reviewer_name}
                        </span>{" "}
                        on{" "}
                        {app.reviewed_at
                          ? new Date(app.reviewed_at).toLocaleDateString()
                          : "—"}
                        {app.review_notes && (
                          <span className="block mt-1 italic">
                            "{app.review_notes}"
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons (only for pending) */}
                    {app.status === "pending" && !actionTarget && (
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionTarget({ id: app.id, action: "approve" });
                          }}
                          className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionTarget({ id: app.id, action: "reject" });
                          }}
                          className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

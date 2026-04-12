import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Check,
  X,
  Search,
  RefreshCw,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";

/**
 * GeoActionQueueSection — Admin panel for tiered geo-admin action requests.
 * Users request elevated geographic actions (edit boundaries, rename zones, etc.)
 * Admin reviews and approves or rejects each request.
 */
export function GeoActionQueueSection() {
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

  // Fetch requests
  const { data: requestData, isLoading } = useQuery({
    queryKey: ["geo-action-requests", statusFilter],
    queryFn: async () => {
      const endpoint =
        statusFilter === "pending"
          ? "/api/geo-actions/pending"
          : `/api/geo-actions/my-requests?status=${statusFilter}`;
      const res = await authenticatedFetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch geo requests");
      return res.json();
    },
    refetchInterval: 15000, // faster refresh for pending queue
  });

  const requests = requestData?.requests || [];

  const filtered = searchQuery
    ? requests.filter(
        (r: any) =>
          r.action_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.requester_email
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          r.justification?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : requests;

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await authenticatedFetch(`/api/geo-actions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: notes }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setActionTarget(null);
        setReviewNotes("");
        queryClient.invalidateQueries({
          queryKey: ["geo-action-requests"],
        });
      } else {
        setFeedback({ type: "error", message: data.message });
      }
    },
    onError: () =>
      setFeedback({ type: "error", message: "Failed to approve request" }),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await authenticatedFetch(`/api/geo-actions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: notes }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setActionTarget(null);
        setReviewNotes("");
        queryClient.invalidateQueries({
          queryKey: ["geo-action-requests"],
        });
      } else {
        setFeedback({ type: "error", message: data.message });
      }
    },
    onError: () =>
      setFeedback({ type: "error", message: "Failed to reject request" }),
  });

  const handleAction = () => {
    if (!actionTarget) return;
    if (actionTarget.action === "approve") {
      approveMutation.mutate({ id: actionTarget.id, notes: reviewNotes });
    } else {
      rejectMutation.mutate({ id: actionTarget.id, notes: reviewNotes });
    }
  };

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: "bg-gray-100 text-gray-600",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[priority] || "bg-gray-100 text-gray-600"}`}
      >
        {priority || "medium"}
      </span>
    );
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-500",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}
      >
        {status}
      </span>
    );
  };

  const actionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      edit_boundary: "Edit Boundary",
      rename_zone: "Rename Zone",
      merge_zones: "Merge Zones",
      create_zone: "Create Zone",
      delete_zone: "Delete Zone",
      update_metadata: "Update Metadata",
      reassign_region: "Reassign Region",
    };
    return labels[type] || type?.replace(/_/g, " ") || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-emerald-600" />
            Geo-Action Queue
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Review geographic action requests from tiered geo-admins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </span>
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

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
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
          placeholder="Search by action type, entity, requester, or justification..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Action Modal (inline) */}
      {actionTarget && (
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-lg mb-2">
            {actionTarget.action === "approve"
              ? "✅ Approve Geo-Action"
              : "❌ Reject Geo-Action"}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {actionTarget.action === "approve"
              ? "This will execute the geographic modification immediately."
              : "Provide a reason for rejection."}
          </p>
          {actionTarget.action === "approve" && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Approving a geo-action may modify geographic boundaries or zone
                data.
              </span>
            </div>
          )}
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={
              actionTarget.action === "approve"
                ? "Optional admin notes..."
                : "Reason for rejection (required)..."
            }
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${
                actionTarget.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {approveMutation.isPending || rejectMutation.isPending
                ? "Processing..."
                : actionTarget.action === "approve"
                  ? "Approve & Execute"
                  : "Reject Request"}
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

      {/* Requests List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Globe className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No {statusFilter} geo-action requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req: any) => {
            const isExpanded = expandedId === req.id;
            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Summary Row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {actionTypeLabel(req.action_type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {req.entity_type} #{req.entity_id} •{" "}
                        {req.requester_email || `User #${req.user_id}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {priorityBadge(req.priority)}
                    {statusBadge(req.status)}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(req.created_at).toLocaleDateString()}
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
                        <p className="text-xs text-gray-500">Action</p>
                        <p className="text-sm font-medium">
                          {actionTypeLabel(req.action_type)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Entity</p>
                        <p className="text-sm font-medium">
                          {req.entity_type} #{req.entity_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          Required Access Level
                        </p>
                        <p className="text-sm font-medium capitalize">
                          {req.required_level || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Priority</p>
                        <p className="text-sm">{priorityBadge(req.priority)}</p>
                      </div>
                    </div>

                    {req.justification && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">
                          Justification
                        </p>
                        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">
                          {req.justification}
                        </p>
                      </div>
                    )}

                    {req.payload && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">
                          Request Payload
                        </p>
                        <pre className="text-xs text-gray-600 bg-white rounded-lg p-3 border border-gray-100 overflow-auto max-h-32">
                          {typeof req.payload === "string"
                            ? req.payload
                            : JSON.stringify(req.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {req.reviewer_email && (
                      <div className="mb-4 text-xs text-gray-500">
                        Reviewed by{" "}
                        <span className="font-medium text-gray-700">
                          {req.reviewer_email}
                        </span>{" "}
                        on{" "}
                        {req.reviewed_at
                          ? new Date(req.reviewed_at).toLocaleDateString()
                          : "—"}
                        {req.review_notes && (
                          <span className="block mt-1 italic">
                            "{req.review_notes}"
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons (only for pending) */}
                    {req.status === "pending" && !actionTarget && (
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionTarget({ id: req.id, action: "approve" });
                          }}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionTarget({ id: req.id, action: "reject" });
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
    </div>
  );
}

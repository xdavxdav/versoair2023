import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Search,
  RefreshCw,
  Plus,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";

/**
 * ContractorAssignmentSection — Admin panel for creating contracts
 * and assigning them to approved contractors from the pool.
 */
export function ContractorAssignmentSection() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [page, setPage] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    contractorId: "",
    title: "",
    description: "",
    terms: "",
    deadline: "",
    paymentAmount: "",
  });
  const [contractorSearch, setContractorSearch] = useState("");

  // Fetch assignments
  const { data: assignData, isLoading } = useQuery({
    queryKey: ["contractor-assignments", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "20");
      const res = await authenticatedFetch(
        `/api/contractor-pipeline/assignments?${params}`,
      );
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const assignments = assignData?.assignments || [];
  const total = assignData?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // Fetch approved contractors (for the assign form dropdown)
  const { data: contractorData } = useQuery({
    queryKey: ["approved-contractors", contractorSearch],
    queryFn: async () => {
      const res = await authenticatedFetch(
        `/api/contractor-pipeline/contractors?search=${encodeURIComponent(contractorSearch)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch contractors");
      return res.json();
    },
    enabled: showAssignForm,
  });

  const contractors = contractorData?.contractors || [];

  // Filtered assignments by search
  const filtered = searchQuery
    ? assignments.filter(
        (a: any) =>
          a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.contractor_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          a.contractor_email?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : assignments;

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await authenticatedFetch(`/api/contractor-pipeline/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: Number(data.contractorId),
          title: data.title,
          description: data.description || undefined,
          terms: data.terms || undefined,
          deadline: data.deadline || undefined,
          paymentAmount: data.paymentAmount || undefined,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setFeedback({ type: "success", message: data.message });
        setShowAssignForm(false);
        setFormData({
          contractorId: "",
          title: "",
          description: "",
          terms: "",
          deadline: "",
          paymentAmount: "",
        });
        queryClient.invalidateQueries({
          queryKey: ["contractor-assignments"],
        });
      } else {
        setFeedback({ type: "error", message: data.message });
      }
    },
    onError: () =>
      setFeedback({ type: "error", message: "Failed to assign contract" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractorId || !formData.title) {
      setFeedback({
        type: "error",
        message: "Contractor and title are required",
      });
      return;
    }
    assignMutation.mutate(formData);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      offered: "bg-blue-100 text-blue-700",
      accepted: "bg-green-100 text-green-700",
      declined: "bg-red-100 text-red-700",
      in_progress: "bg-indigo-100 text-indigo-700",
      completed: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-gray-100 text-gray-500",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || "bg-gray-100 text-gray-600"}`}
      >
        {status?.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-purple-600" />
            Contract Assignments
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage contracts assigned to approved contractors
          </p>
        </div>
        <button
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Contract
        </button>
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

      {/* New Contract Form */}
      {showAssignForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border-2 border-purple-200 rounded-xl p-5 shadow-lg space-y-4"
        >
          <h3 className="font-semibold text-lg">📝 Assign New Contract</h3>

          {/* Contractor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor *
            </label>
            <input
              type="text"
              value={contractorSearch}
              onChange={(e) => setContractorSearch(e.target.value)}
              placeholder="Search contractors by name, email, or specialization..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
            />
            {contractors.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {contractors.map((c: any) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        contractorId: String(c.id),
                      }));
                      setContractorSearch(
                        `${c.name} (${c.specialization || "General"})`,
                      );
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${
                      formData.contractorId === String(c.id)
                        ? "bg-purple-50 border-l-2 border-purple-500"
                        : ""
                    }`}
                  >
                    <div>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-gray-500 ml-2">{c.email}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {c.specialization || "General"}
                      {c.hourly_rate && ` • $${c.hourly_rate}/hr`}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {formData.contractorId && (
              <p className="text-xs text-purple-600 mt-1">
                ✓ Contractor #{formData.contractorId} selected
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g. Website Redesign, Stage Setup, etc."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Scope of work, deliverables..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Terms + Deadline + Payment in a row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms
              </label>
              <input
                type="text"
                value={formData.terms}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, terms: e.target.value }))
                }
                placeholder="Net-30, milestone-based..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deadline: e.target.value,
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount
              </label>
              <input
                type="text"
                value={formData.paymentAmount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentAmount: e.target.value,
                  }))
                }
                placeholder="e.g. 2500.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={assignMutation.isPending}
              className="px-5 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Contract"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAssignForm(false);
                setFormData({
                  contractorId: "",
                  title: "",
                  description: "",
                  terms: "",
                  deadline: "",
                  paymentAmount: "",
                });
                setContractorSearch("");
              }}
              className="px-5 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
        {[
          { val: "", label: "All" },
          { val: "offered", label: "Offered" },
          { val: "accepted", label: "Accepted" },
          { val: "in_progress", label: "In Progress" },
          { val: "completed", label: "Completed" },
          { val: "declined", label: "Declined" },
        ].map((s) => (
          <button
            key={s.val}
            onClick={() => {
              setStatusFilter(s.val);
              setPage(1);
            }}
            className={`flex-1 min-w-[80px] px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === s.val
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
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
          placeholder="Search by title, contractor name, or email..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Assignments List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading assignments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>
            No {statusFilter ? statusFilter.replace("_", " ") : ""} contracts
            found
          </p>
          <button
            onClick={() => setShowAssignForm(true)}
            className="mt-3 text-purple-600 text-sm hover:underline"
          >
            Create your first contract →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((assign: any) => {
            const isExpanded = expandedId === assign.id;
            return (
              <div
                key={assign.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Summary Row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : assign.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {assign.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        <User className="h-3 w-3 inline mr-1" />
                        {assign.contractor_name || "Unknown"} •{" "}
                        {assign.contractor_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(assign.status)}
                    {assign.payment_amount && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {assign.payment_amount}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(assign.created_at).toLocaleDateString()}
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
                        <p className="text-xs text-gray-500">Contractor</p>
                        <p className="text-sm font-medium">
                          {assign.contractor_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {assign.specialization || "General"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Assigned By</p>
                        <p className="text-sm font-medium">
                          {assign.assigned_by_name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Deadline</p>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {assign.deadline
                            ? new Date(assign.deadline).toLocaleDateString()
                            : "No deadline"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Payment</p>
                        <p className="text-sm font-medium">
                          {assign.payment_amount
                            ? `$${assign.payment_amount}`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {assign.description && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">
                          Description
                        </p>
                        <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">
                          {assign.description}
                        </p>
                      </div>
                    )}

                    {assign.terms && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Terms</p>
                        <p className="text-sm text-gray-700">{assign.terms}</p>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="flex gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                      <span>
                        Created:{" "}
                        {new Date(assign.created_at).toLocaleDateString()}
                      </span>
                      {assign.accepted_at && (
                        <span>
                          Accepted:{" "}
                          {new Date(assign.accepted_at).toLocaleDateString()}
                        </span>
                      )}
                      {assign.completed_at && (
                        <span>
                          Completed:{" "}
                          {new Date(assign.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
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

      {/* Stats Footer */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 text-center">
        Showing {filtered.length} of {total} contract
        {total !== 1 ? "s" : ""}
        {statusFilter && (
          <span className="ml-1">
            (filtered by: {statusFilter.replace("_", " ")})
          </span>
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  RefreshCw,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";

/**
 * TSRWhitelistSection — Admin panel for managing Technical Service Representatives.
 * TSR users get full CRUD geo-admin access without queue delays.
 * Adding/removing from whitelist is instant and revocation kills all active sessions.
 */
export function TSRWhitelistSection() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch TSR whitelist
  const {
    data: tsrData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["tsr-whitelist"],
    queryFn: async () => {
      const res = await authenticatedFetch("/auth/tsr/whitelist");
      if (!res.ok) throw new Error("Failed to fetch TSR whitelist");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const entries = tsrData?.entries || [];
  const filtered = searchQuery
    ? entries.filter(
        (e: any) =>
          e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.granted_by_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : entries;

  const activeCount = entries.filter((e: any) => e.is_active).length;

  // Add to whitelist
  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await authenticatedFetch("/auth/tsr/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setFeedback({
          type: "success",
          message: data.reactivated
            ? `TSR access re-activated for ${newEmail}`
            : `${newEmail} added to TSR whitelist`,
        });
        setNewEmail("");
        setShowAddForm(false);
        queryClient.invalidateQueries({ queryKey: ["tsr-whitelist"] });
      } else {
        setFeedback({ type: "error", message: data.message });
      }
    },
    onError: () =>
      setFeedback({ type: "error", message: "Failed to add TSR user" }),
  });

  // Revoke from whitelist (instant session kill)
  const revokeMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await authenticatedFetch(
        `/auth/tsr/whitelist/${encodeURIComponent(email)}`,
        { method: "DELETE" },
      );
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setFeedback({
          type: "success",
          message: `TSR access revoked${data.sessionsRevoked ? " — all sessions terminated" : ""}`,
        });
        setConfirmRevoke(null);
        queryClient.invalidateQueries({ queryKey: ["tsr-whitelist"] });
      } else {
        setFeedback({ type: "error", message: data.message });
      }
    },
    onError: () =>
      setFeedback({ type: "error", message: "Failed to revoke TSR access" }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            TSR Whitelist
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Technical Service Representatives — full geo-admin CRUD access, no
            queue delays
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add TSR User
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
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

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Total Whitelisted
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {entries.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Active
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Inactive
          </p>
          <p className="text-2xl font-bold text-gray-400 mt-1">
            {entries.length - activeCount}
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-900 mb-3">
            Add User to TSR Whitelist
          </h3>
          <p className="text-xs text-blue-700 mb-4">
            The user must have a Max or Enterprise subscription. On their next
            login, their role will be upgraded to TSR with full geo-admin
            access.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newEmail.trim()) {
                  addMutation.mutate(newEmail.trim().toLowerCase());
                }
              }}
            />
            <button
              onClick={() =>
                newEmail.trim() &&
                addMutation.mutate(newEmail.trim().toLowerCase())
              }
              disabled={!newEmail.trim() || addMutation.isPending}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addMutation.isPending ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewEmail("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by email or granted by..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading whitelist...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>
            {searchQuery
              ? "No matching TSR entries"
              : "No TSR users yet. Add one to get started."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Granted By
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Date Added
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((entry: any) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {entry.email}
                  </td>
                  <td className="px-4 py-3">
                    {entry.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <ToggleRight className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        <ToggleLeft className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {entry.granted_by_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {entry.granted_at
                      ? new Date(entry.granted_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmRevoke === entry.email ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Revoke? Sessions will be killed
                        </span>
                        <button
                          onClick={() => revokeMutation.mutate(entry.email)}
                          disabled={revokeMutation.isPending}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {revokeMutation.isPending ? "..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmRevoke(null)}
                          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRevoke(entry.email)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                        title="Revoke TSR access and kill all sessions"
                      >
                        <UserX className="h-3 w-3" />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-1">
          How TSR Whitelist Works
        </p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            Whitelisted users with Max or Enterprise tier get TSR role on login
          </li>
          <li>
            TSR role grants full geo-admin CRUD — no queue delays or approvals
            needed
          </li>
          <li>
            Revoking instantly kills all active sessions — user is logged out
            immediately
          </li>
          <li>
            TSR users appear as staff in geo-admin and can approve subscriber
            action requests
          </li>
        </ul>
      </div>
    </div>
  );
}

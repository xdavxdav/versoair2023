/**
 * 🔥 PURGATOIRE — Admin Track Moderation Page
 *
 * Queue of uploaded tracks pending review.
 * Superadmin + Admin → Approve / Reject
 * Moderator → Flag only
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Flag,
  Music,
  Clock,
  User,
  Filter,
  Play,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileAudio,
} from "lucide-react";

// ─── API HELPERS ────────────────────────────────────────────────────────────────

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJson(url: string, body: Record<string, any>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── HOOKS ──────────────────────────────────────────────────────────────────────

function useQueue(status: string, page: number) {
  return useQuery({
    queryKey: ["purgatoire", "queue", status, page],
    queryFn: () =>
      fetchJson(`/api/purgatoire/queue?status=${status}&page=${page}&limit=30`),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

function useStats() {
  return useQuery({
    queryKey: ["purgatoire", "stats"],
    queryFn: () => fetchJson("/api/purgatoire/stats"),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ─── DURATION FORMATTER ─────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── MAIN PAGE COMPONENT ────────────────────────────────────────────────────────

export default function PurgatoirePage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [page, setPage] = useState(1);
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const [approveNotes, setApproveNotes] = useState("");
  const [actionTrack, setActionTrack] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"reject" | "flag" | null>(null);

  const { data: queueData, isLoading } = useQueue(statusFilter, page);
  const { data: statsData } = useStats();
  const stats = statsData?.stats || {};
  const tracks = queueData?.tracks || [];
  const canApprove = queueData?.canApprove ?? false;
  const pagination = queueData?.pagination || { page: 1, pages: 1, total: 0 };

  // ── Mutations ──

  const approveMutation = useMutation({
    mutationFn: (trackId: number) =>
      postJson(`/api/purgatoire/${trackId}/approve`, {
        notes: approveNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purgatoire"] });
      setApproveNotes("");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ trackId, reason }: { trackId: number; reason: string }) =>
      postJson(`/api/purgatoire/${trackId}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purgatoire"] });
      setRejectReason("");
      setActionTrack(null);
      setActionType(null);
    },
  });

  const flagMutation = useMutation({
    mutationFn: ({ trackId, notes }: { trackId: number; notes: string }) =>
      postJson(`/api/purgatoire/${trackId}/flag`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purgatoire"] });
      setFlagNotes("");
      setActionTrack(null);
      setActionType(null);
    },
  });

  return (
    <div className="min-h-screen bg-[#f3efe9] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Purgatoire</h1>
              <p className="text-sm text-slate-600">Track Moderation Queue</p>
            </div>
          </div>
          <button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["purgatoire"] })
            }
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* ═══ STATS BANNER ═══ */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Pending Review",
              value: stats.pending || 0,
              color: "text-amber-600",
              bg: "bg-amber-50",
              icon: Clock,
            },
            {
              label: "Approved Today",
              value: stats.approved_today || 0,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              icon: CheckCircle2,
            },
            {
              label: "Rejected Today",
              value: stats.rejected_today || 0,
              color: "text-red-600",
              bg: "bg-red-50",
              icon: XCircle,
            },
            {
              label: "Artists Waiting",
              value: stats.artists_waiting || 0,
              color: "text-blue-600",
              bg: "bg-blue-50",
              icon: User,
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`${s.bg} rounded-xl border border-slate-200 p-4 shadow-sm`}
            >
              <div className="mb-1 flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs uppercase tracking-wider text-slate-600">
                  {s.label}
                </span>
              </div>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* ═══ FILTER TABS ═══ */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {[
            { value: "pending_review", label: "Pending", count: stats.pending },
            {
              value: "published",
              label: "Published",
              count: stats.total_published,
            },
            {
              value: "rejected",
              label: "Rejected",
              count: stats.total_rejected,
            },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === tab.value
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ TRACK QUEUE ═══ */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">
              No tracks in {statusFilter.replace("_", " ")}
            </p>
            {statusFilter === "pending_review" && (
              <p className="text-sm mt-1 text-gray-600">
                All clear — no tracks waiting for review!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track: any) => (
              <div
                key={track.id}
                className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors"
              >
                {/* ── Track Row ── */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedTrack(
                      expandedTrack === track.id ? null : track.id,
                    )
                  }
                >
                  {/* Cover art */}
                  <div className="w-14 h-14 rounded-lg bg-white/5 flex-shrink-0 overflow-hidden">
                    {track.cover_art ? (
                      <img
                        src={track.cover_art}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileAudio className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">
                        {track.title}
                      </h3>
                      {track.is_explicit && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-bold">
                          E
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>{track.artist_name || "Unknown Artist"}</span>
                      {track.genre && <span className="text-gray-600">•</span>}
                      {track.genre && <span>{track.genre}</span>}
                      {track.duration && (
                        <span className="text-gray-600">•</span>
                      )}
                      {track.duration && (
                        <span>{formatDuration(track.duration)}</span>
                      )}
                    </div>
                  </div>

                  {/* Upload date */}
                  <div className="hidden md:block text-sm text-gray-500">
                    {new Date(track.created_at).toLocaleDateString("fr-CA")}
                  </div>

                  {/* File size */}
                  <div className="hidden md:block text-sm text-gray-500">
                    {formatBytes(track.file_size)}
                  </div>

                  {/* Status badge */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      track.status === "pending_review"
                        ? "bg-amber-500/15 text-amber-400"
                        : track.status === "published"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {track.status === "pending_review"
                      ? "Pending"
                      : track.status === "published"
                        ? "Published"
                        : "Rejected"}
                  </div>

                  {/* Expand chevron */}
                  {expandedTrack === track.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                {/* ── Expanded Detail Panel ── */}
                {expandedTrack === track.id && (
                  <div className="border-t border-white/5 p-5 space-y-4 bg-white/[0.01]">
                    {/* Audio preview */}
                    {track.audio_url && (
                      <div className="flex items-center gap-3">
                        <Play className="w-4 h-4 text-amber-400" />
                        <audio
                          controls
                          preload="none"
                          className="flex-1 h-10 [&::-webkit-media-controls-panel]:bg-gray-800 rounded-lg"
                        >
                          <source
                            src={track.audio_url}
                            type={track.mime_type || "audio/mpeg"}
                          />
                        </audio>
                      </div>
                    )}

                    {/* Details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {[
                        { label: "BPM", value: track.bpm || "—" },
                        { label: "Key", value: track.musical_key || "—" },
                        { label: "Mood", value: track.mood || "—" },
                        {
                          label: "Format",
                          value:
                            track.mime_type
                              ?.replace("audio/", "")
                              .toUpperCase() || "—",
                        },
                        {
                          label: "Artist Email",
                          value: track.uploader_email || "—",
                        },
                        {
                          label: "Division",
                          value: track.artist_division || "—",
                        },
                        { label: "File", value: track.file_name || "—" },
                        {
                          label: "Uploaded",
                          value: new Date(track.created_at).toLocaleString(
                            "fr-CA",
                          ),
                        },
                      ].map((d) => (
                        <div key={d.label}>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">
                            {d.label}
                          </span>
                          <p className="text-gray-300 truncate">{d.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    {track.description && (
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">
                          Description
                        </span>
                        <p className="text-gray-300 text-sm mt-1">
                          {track.description}
                        </p>
                      </div>
                    )}

                    {/* Existing moderation notes */}
                    {track.moderation_notes && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                        <span className="text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Moderation Notes
                        </span>
                        <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">
                          {track.moderation_notes}
                        </p>
                      </div>
                    )}

                    {/* Rejection reason (for rejected tracks) */}
                    {track.rejection_reason && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <span className="text-xs text-red-400 uppercase tracking-wider">
                          Rejection Reason
                        </span>
                        <p className="text-gray-300 text-sm mt-1">
                          {track.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Reviewer info */}
                    {track.reviewer_name && (
                      <div className="text-xs text-gray-500">
                        Reviewed by{" "}
                        <span className="text-gray-400">
                          {track.reviewer_name}
                        </span>{" "}
                        on {new Date(track.reviewed_at).toLocaleString("fr-CA")}
                      </div>
                    )}

                    {/* ── Action Buttons ── */}
                    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                      {/* Approve (superadmin/admin only) */}
                      {canApprove && track.status === "pending_review" && (
                        <button
                          onClick={() => approveMutation.mutate(track.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {approveMutation.isPending
                            ? "Approving..."
                            : "Approve & Publish"}
                        </button>
                      )}

                      {/* Reject (superadmin/admin only) */}
                      {canApprove && track.status === "pending_review" && (
                        <button
                          onClick={() => {
                            setActionTrack(track.id);
                            setActionType("reject");
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium text-sm transition-colors border border-red-500/30"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      )}

                      {/* Flag (moderator+) */}
                      <button
                        onClick={() => {
                          setActionTrack(track.id);
                          setActionType("flag");
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm transition-colors border border-amber-500/20"
                      >
                        <Flag className="w-4 h-4" />
                        Flag
                      </button>

                      {/* Re-approve rejected track */}
                      {canApprove && track.status === "rejected" && (
                        <button
                          onClick={() => approveMutation.mutate(track.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Re-approve & Publish
                        </button>
                      )}
                    </div>

                    {/* ── Rejection reason input ── */}
                    {actionTrack === track.id && actionType === "reject" && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-3">
                        <label className="text-sm text-red-400 font-medium">
                          Reason for rejection (shown to artist):
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g., Audio quality too low, contains copyrighted samples, explicit content not marked..."
                          className="w-full bg-gray-900/50 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (rejectReason.trim()) {
                                rejectMutation.mutate({
                                  trackId: track.id,
                                  reason: rejectReason.trim(),
                                });
                              }
                            }}
                            disabled={
                              !rejectReason.trim() || rejectMutation.isPending
                            }
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                          >
                            {rejectMutation.isPending
                              ? "Rejecting..."
                              : "Confirm Rejection"}
                          </button>
                          <button
                            onClick={() => {
                              setActionTrack(null);
                              setActionType(null);
                              setRejectReason("");
                            }}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Flag notes input ── */}
                    {actionTrack === track.id && actionType === "flag" && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-3">
                        <label className="text-sm text-amber-400 font-medium">
                          Flag notes (internal — not shown to artist):
                        </label>
                        <textarea
                          value={flagNotes}
                          onChange={(e) => setFlagNotes(e.target.value)}
                          placeholder="e.g., Possible copyright issue, check sample at 1:32..."
                          className="w-full bg-gray-900/50 border border-amber-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (flagNotes.trim()) {
                                flagMutation.mutate({
                                  trackId: track.id,
                                  notes: flagNotes.trim(),
                                });
                              }
                            }}
                            disabled={
                              !flagNotes.trim() || flagMutation.isPending
                            }
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                          >
                            {flagMutation.isPending
                              ? "Flagging..."
                              : "Submit Flag"}
                          </button>
                          <button
                            onClick={() => {
                              setActionTrack(null);
                              setActionType(null);
                              setFlagNotes("");
                            }}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ PAGINATION ═══ */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm disabled:opacity-30"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {pagination.page} / {pagination.pages} ({pagination.total}{" "}
              tracks)
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.pages, page + 1))}
              disabled={page >= pagination.pages}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock,
  Eye,
  Star,
  Award,
  TrendingUp,
  Users,
  Music,
  Globe,
  ExternalLink,
  ArrowUpDown,
  Shield,
  Sparkles,
  AlertTriangle,
  Ban,
} from "lucide-react";

// ─── Types ─────────────────────────────────────
interface ContractApplication {
  id: number;
  email: string;
  stage_name: string;
  legal_name: string;
  genre: string;
  country: string;
  country_code: string;
  biography: string;
  portfolio_url: string;
  spotify_url: string;
  instagram_url: string;
  website_url: string;
  sample_track_url: string;
  motivation: string;
  monthly_listeners: number;
  years_active: number;
  grade: string;
  status: string;
  revenue_share_artist: number;
  revenue_share_platform: number;
  audio_quality: string;
  max_downloads_per_month: number;
  can_be_featured: boolean;
  has_analytics_access: boolean;
  has_priority_support: boolean;
  review_notes: string;
  rejection_reason: string;
  reviewer_name: string;
  applied_at: string;
  reviewed_at: string;
  contract_start_date: string;
  agreed_to_terms: boolean;
  artist_id: number;
}

interface GradeTier {
  grade: string;
  label: string;
  labelFr: string;
  revenueShareArtist: number;
  revenueSharePlatform: number;
  maxDownloads: number | string;
  audioQuality: string;
  canBeFeatured: boolean;
  hasAnalytics: boolean;
  hasPrioritySupport: boolean;
  color: string;
  description: string;
  descriptionFr: string;
  requirements: string[];
}

interface Stats {
  pending: string;
  under_review: string;
  approved: string;
  rejected: string;
  grade_s: string;
  grade_a: string;
  grade_b: string;
  grade_c: string;
  total: string;
}

// ─── Grade badge component ──────────────────────
function GradeBadge({
  grade,
  size = "md",
}: {
  grade: string;
  size?: "sm" | "md" | "lg";
}) {
  const colors: Record<string, string> = {
    S: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    A: "bg-gray-300/20 text-gray-300 border-gray-400/30",
    B: "bg-amber-700/20 text-amber-600 border-amber-700/30",
    C: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    pending: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <span
      className={`rounded-md font-bold border ${colors[grade] || colors.pending} ${sizeClasses[size]}`}
    >
      {grade === "pending"
        ? "EN ATTENTE"
        : grade === "rejected"
          ? "REFUSÉ"
          : `Grade ${grade}`}
    </span>
  );
}

// ─── Status badge ───────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; icon: any; label: string }> = {
    pending: {
      bg: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      icon: Clock,
      label: "En attente",
    },
    under_review: {
      bg: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      icon: Eye,
      label: "En examen",
    },
    approved: {
      bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      icon: Check,
      label: "Approuvé",
    },
    rejected: {
      bg: "bg-red-500/15 text-red-400 border-red-500/20",
      icon: X,
      label: "Refusé",
    },
    suspended: {
      bg: "bg-orange-500/15 text-orange-400 border-orange-500/20",
      icon: Ban,
      label: "Suspendu",
    },
    expired: {
      bg: "bg-gray-500/15 text-gray-400 border-gray-500/20",
      icon: AlertTriangle,
      label: "Expiré",
    },
  };
  const s = styles[status] || styles.pending;
  const Icon = s.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${s.bg}`}
    >
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function ArtistContractsAdmin() {
  const [applications, setApplications] = useState<ContractApplication[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [grades, setGrades] = useState<GradeTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedApp, setSelectedApp] = useState<ContractApplication | null>(
    null,
  );
  const [reviewAction, setReviewAction] = useState("");
  const [reviewGrade, setReviewGrade] = useState("C");
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showGradeInfo, setShowGradeInfo] = useState(false);

  // Fetch grade tiers
  useEffect(() => {
    fetch("/api/contracts/grades")
      .then((r) => r.json())
      .then((d) => setGrades(d.grades || []))
      .catch(() => {});
  }, []);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterGrade) params.set("grade", filterGrade);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/contracts/admin/applications?${params}`);
      const data = await res.json();
      setApplications(data.applications || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setStats(data.stats || null);
    } catch {
      setApplications([]);
    }
    setLoading(false);
  }, [filterStatus, filterGrade, search, page]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Review action
  const handleReview = async () => {
    if (!selectedApp || !reviewAction) return;
    setActionLoading(true);
    try {
      const body: any = {
        action: reviewAction,
        reviewNotes,
      };
      if (reviewAction === "approve") body.grade = reviewGrade;
      if (reviewAction === "reject") body.rejectionReason = rejectionReason;

      const res = await fetch(`/api/contracts/admin/review/${selectedApp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedApp(null);
        setReviewAction("");
        setReviewNotes("");
        setRejectionReason("");
        fetchApplications();
      }
    } catch {}
    setActionLoading(false);
  };

  // Grade upgrade
  const handleUpgrade = async (id: number, grade: string) => {
    setActionLoading(true);
    try {
      await fetch(`/api/contracts/admin/upgrade/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade }),
      });
      fetchApplications();
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => (prev ? { ...prev, grade } : null));
      }
    } catch {}
    setActionLoading(false);
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0118] via-[#0d021a] to-[#06010d] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
                  Gestion des Contrats Artistes
                </h1>
                <p className="text-white/30 text-sm">
                  Examiner, approuver et gérer les candidatures et grades
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGradeInfo(!showGradeInfo)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-colors text-sm text-white/50"
            >
              <Award className="w-4 h-4" />
              Barème des Grades
              {showGradeInfo ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Grade info panel */}
          <AnimatePresence>
            {showGradeInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {grades.map((g) => (
                    <div
                      key={g.grade}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <GradeBadge grade={g.grade} size="lg" />
                        <span className="text-white/20 text-xs">{g.label}</span>
                      </div>
                      <div className="space-y-1 text-xs text-white/40">
                        <p>
                          Part artiste:{" "}
                          <span className="text-white/70 font-bold">
                            {g.revenueShareArtist}%
                          </span>
                        </p>
                        <p>
                          Qualité audio:{" "}
                          <span className="text-white/70">
                            {g.audioQuality}
                          </span>
                        </p>
                        <p>
                          Downloads/mois:{" "}
                          <span className="text-white/70">
                            {g.maxDownloads}
                          </span>
                        </p>
                        <p>
                          Featured:{" "}
                          <span
                            className={
                              g.canBeFeatured
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            {g.canBeFeatured ? "Oui" : "Non"}
                          </span>
                        </p>
                        <p>
                          Analytics:{" "}
                          <span
                            className={
                              g.hasAnalytics
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            {g.hasAnalytics ? "Oui" : "Non"}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              {
                label: "En attente",
                value: stats.pending,
                color: "text-amber-400",
                icon: Clock,
              },
              {
                label: "En examen",
                value: stats.under_review,
                color: "text-blue-400",
                icon: Eye,
              },
              {
                label: "Approuvés",
                value: stats.approved,
                color: "text-emerald-400",
                icon: Check,
              },
              {
                label: "Refusés",
                value: stats.rejected,
                color: "text-red-400",
                icon: X,
              },
              {
                label: "Grade S",
                value: stats.grade_s,
                color: "text-yellow-400",
                icon: Star,
              },
              {
                label: "Grade A",
                value: stats.grade_a,
                color: "text-gray-300",
                icon: Award,
              },
              {
                label: "Grade B",
                value: stats.grade_b,
                color: "text-amber-600",
                icon: TrendingUp,
              },
              {
                label: "Grade C",
                value: stats.grade_c,
                color: "text-slate-400",
                icon: Users,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center"
              >
                <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="under_review">En examen</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Refusé</option>
            <option value="suspended">Suspendu</option>
          </select>
          <select
            value={filterGrade}
            onChange={(e) => {
              setFilterGrade(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer min-w-[130px]"
          >
            <option value="">Tous les grades</option>
            <option value="S">Grade S</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
            <option value="pending">Non assigné</option>
          </select>
        </div>

        {/* Applications Table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <motion.div
                className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-white/30 text-sm mt-3">Chargement...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">
                Aucune candidature trouvée
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-[10px] text-white/30 uppercase tracking-wider font-medium px-4 py-3">
                      Artiste
                    </th>
                    <th className="text-left text-[10px] text-white/30 uppercase tracking-wider font-medium px-4 py-3">
                      Genre
                    </th>
                    <th className="text-left text-[10px] text-white/30 uppercase tracking-wider font-medium px-4 py-3">
                      <div className="flex items-center gap-1">
                        Listeners <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="text-left text-[10px] text-white/30 uppercase tracking-wider font-medium px-4 py-3">
                      Grade
                    </th>
                    <th className="text-left text-[10px] text-white/30 uppercase tracking-wider font-medium px-4 py-3">
                      Statut
                    </th>
                    <th className="text-left text-[10px] text-white/30 uppercase tracking-wider font-medium px-4 py-3">
                      Date
                    </th>
                    <th className="text-left text-[10px] text-white/30 uppercase tracking-wider font-medium px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedApp(app)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white/80 font-medium text-sm">
                            {app.stage_name}
                          </p>
                          <p className="text-white/30 text-xs">{app.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-sm">
                        {app.genre || "—"}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-sm font-mono">
                        {(app.monthly_listeners || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <GradeBadge grade={app.grade || "pending"} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3 text-white/30 text-xs">
                        {formatDate(app.applied_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {app.status === "pending" && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApp(app);
                                  setReviewAction("approve");
                                }}
                                className="w-7 h-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center transition-colors"
                                title="Approuver"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApp(app);
                                  setReviewAction("reject");
                                }}
                                className="w-7 h-7 rounded-lg bg-red-500/15 hover:bg-red-500/25 flex items-center justify-center transition-colors"
                                title="Refuser"
                              >
                                <X className="w-3.5 h-3.5 text-red-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApp(app);
                                  setReviewAction("under_review");
                                }}
                                className="w-7 h-7 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 flex items-center justify-center transition-colors"
                                title="Marquer en examen"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-400" />
                              </button>
                            </>
                          )}
                          {app.status === "approved" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApp(app);
                              }}
                              className="w-7 h-7 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 flex items-center justify-center transition-colors"
                              title="Voir / Changer grade"
                            >
                              <Award className="w-3.5 h-3.5 text-purple-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white/[0.06]">
              <p className="text-white/30 text-xs">
                {total} candidature{total > 1 ? "s" : ""} • Page {page} /{" "}
                {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs disabled:opacity-30 hover:bg-white/[0.06] transition-colors"
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs disabled:opacity-30 hover:bg-white/[0.06] transition-colors"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          Detail / Review Modal
          ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setSelectedApp(null);
              setReviewAction("");
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0e0618] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-500 flex items-center justify-center text-xl">
                      🎤
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {selectedApp.stage_name}
                      </h2>
                      <p className="text-white/30 text-sm">
                        {selectedApp.legal_name} • {selectedApp.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GradeBadge grade={selectedApp.grade || "pending"} />
                    <StatusBadge status={selectedApp.status} />
                    <button
                      onClick={() => {
                        setSelectedApp(null);
                        setReviewAction("");
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white/30" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Genre
                    </p>
                    <p className="text-white/60 text-sm flex items-center gap-1">
                      <Music className="w-3 h-3" /> {selectedApp.genre || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Pays
                    </p>
                    <p className="text-white/60 text-sm flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {selectedApp.country || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Auditeurs/mois
                    </p>
                    <p className="text-white/60 text-sm font-mono">
                      {(selectedApp.monthly_listeners || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Années actives
                    </p>
                    <p className="text-white/60 text-sm">
                      {selectedApp.years_active || 0} ans
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Date de candidature
                    </p>
                    <p className="text-white/60 text-sm">
                      {formatDate(selectedApp.applied_at)}
                    </p>
                  </div>
                  {selectedApp.reviewed_at && (
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                        Examiné le
                      </p>
                      <p className="text-white/60 text-sm">
                        {formatDate(selectedApp.reviewed_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Biography */}
                {selectedApp.biography && (
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Biographie
                    </p>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {selectedApp.biography}
                    </p>
                  </div>
                )}

                {/* Motivation */}
                {selectedApp.motivation && (
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Motivation
                    </p>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {selectedApp.motivation}
                    </p>
                  </div>
                )}

                {/* Links */}
                <div className="flex flex-wrap gap-2">
                  {selectedApp.spotify_url && (
                    <a
                      href={selectedApp.spotify_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs hover:bg-green-500/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Spotify
                    </a>
                  )}
                  {selectedApp.instagram_url && (
                    <a
                      href={selectedApp.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs hover:bg-pink-500/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Instagram
                    </a>
                  )}
                  {selectedApp.website_url && (
                    <a
                      href={selectedApp.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Website
                    </a>
                  )}
                  {selectedApp.sample_track_url && (
                    <a
                      href={selectedApp.sample_track_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/20 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Sample Track
                    </a>
                  )}
                </div>

                {/* Contract Benefits (if approved) */}
                {selectedApp.status === "approved" && (
                  <div className="p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15 space-y-3">
                    <h4 className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Avantages du Contrat
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-white/30">Part artiste:</span>{" "}
                        <span className="text-emerald-400 font-bold">
                          {selectedApp.revenue_share_artist}%
                        </span>
                      </div>
                      <div>
                        <span className="text-white/30">Qualité audio:</span>{" "}
                        <span className="text-white/60">
                          {selectedApp.audio_quality}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/30">Downloads/mois:</span>{" "}
                        <span className="text-white/60">
                          {selectedApp.max_downloads_per_month === -1
                            ? "Illimité"
                            : selectedApp.max_downloads_per_month}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/30">Featured:</span>{" "}
                        <span
                          className={
                            selectedApp.can_be_featured
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {selectedApp.can_be_featured ? "Oui" : "Non"}
                        </span>
                      </div>
                    </div>

                    {/* Grade upgrade buttons */}
                    <div className="pt-2 border-t border-emerald-500/10">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">
                        Changer le grade
                      </p>
                      <div className="flex gap-2">
                        {["S", "A", "B", "C"].map((g) => (
                          <button
                            key={g}
                            onClick={() => handleUpgrade(selectedApp.id, g)}
                            disabled={g === selectedApp.grade || actionLoading}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              g === selectedApp.grade
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                : "bg-white/[0.04] text-white/30 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/50"
                            } disabled:opacity-30`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection reason (if rejected) */}
                {selectedApp.status === "rejected" &&
                  selectedApp.rejection_reason && (
                    <div className="p-4 rounded-xl bg-red-500/[0.05] border border-red-500/15">
                      <h4 className="text-red-400 text-sm font-medium mb-1">
                        Raison du refus
                      </h4>
                      <p className="text-white/40 text-sm">
                        {selectedApp.rejection_reason}
                      </p>
                    </div>
                  )}

                {/* Review Notes */}
                {selectedApp.review_notes && (
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                      Notes d'examen
                    </p>
                    <p className="text-white/40 text-sm">
                      {selectedApp.review_notes}
                    </p>
                  </div>
                )}

                {/* ── Review Action Panel ── */}
                {(selectedApp.status === "pending" ||
                  selectedApp.status === "under_review") && (
                  <div className="p-4 rounded-xl bg-purple-500/[0.05] border border-purple-500/15 space-y-4">
                    <h4 className="text-purple-400 text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Action d'examen
                    </h4>

                    {/* Action selector */}
                    <div className="flex gap-2">
                      {[
                        {
                          value: "approve",
                          label: "Approuver",
                          color: "emerald",
                        },
                        { value: "reject", label: "Refuser", color: "red" },
                        {
                          value: "under_review",
                          label: "En examen",
                          color: "blue",
                        },
                        {
                          value: "suspend",
                          label: "Suspendre",
                          color: "orange",
                        },
                      ].map((a) => (
                        <button
                          key={a.value}
                          onClick={() => setReviewAction(a.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                            reviewAction === a.value
                              ? `bg-${a.color}-500/20 text-${a.color}-400 border-${a.color}-500/30`
                              : "bg-white/[0.04] text-white/30 border-white/[0.08] hover:bg-white/[0.06]"
                          }`}
                          style={
                            reviewAction === a.value
                              ? {
                                  backgroundColor:
                                    a.color === "emerald"
                                      ? "rgba(16,185,129,0.15)"
                                      : a.color === "red"
                                        ? "rgba(239,68,68,0.15)"
                                        : a.color === "blue"
                                          ? "rgba(59,130,246,0.15)"
                                          : "rgba(249,115,22,0.15)",
                                  color:
                                    a.color === "emerald"
                                      ? "#34d399"
                                      : a.color === "red"
                                        ? "#f87171"
                                        : a.color === "blue"
                                          ? "#60a5fa"
                                          : "#fb923c",
                                }
                              : undefined
                          }
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>

                    {/* Grade selector (for approve) */}
                    {reviewAction === "approve" && (
                      <div>
                        <p className="text-white/40 text-xs mb-2">
                          Sélectionner le grade:
                        </p>
                        <div className="flex gap-2">
                          {["S", "A", "B", "C"].map((g) => {
                            const tier = grades.find((t) => t.grade === g);
                            return (
                              <button
                                key={g}
                                onClick={() => setReviewGrade(g)}
                                className={`flex-1 p-3 rounded-xl text-center transition-colors border ${
                                  reviewGrade === g
                                    ? "bg-purple-500/15 border-purple-500/30"
                                    : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
                                }`}
                              >
                                <GradeBadge grade={g} size="md" />
                                <p className="text-white/30 text-[10px] mt-1">
                                  {tier?.revenueShareArtist || 0}%
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Rejection reason (for reject) */}
                    {reviewAction === "reject" && (
                      <div>
                        <p className="text-white/40 text-xs mb-2">
                          Raison du refus:
                        </p>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Expliquez la raison du refus..."
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 text-sm resize-none"
                        />
                      </div>
                    )}

                    {/* Notes */}
                    {reviewAction && (
                      <>
                        <div>
                          <p className="text-white/40 text-xs mb-2">
                            Notes (interne):
                          </p>
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Notes pour l'équipe..."
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 text-sm resize-none"
                          />
                        </div>

                        <button
                          onClick={handleReview}
                          disabled={actionLoading}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-purple-500/20"
                        >
                          {actionLoading
                            ? "Traitement..."
                            : "Confirmer l'action"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

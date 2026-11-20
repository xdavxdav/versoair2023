import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  MapPin,
  Music,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  TmuPortalHeader,
  TmuReviewConsoleShell,
  TmuStatusChip,
} from "@/components/music/TmuPrimitives";
import { TmuShell } from "@/components/music/TmuShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { failureFromThrown } from "@/lib/submit-json";

const STATUS_FILTERS = [
  { id: "pending", label: "En attente" },
  { id: "approved", label: "Approuvées" },
  { id: "rejected", label: "Refusées" },
  { id: "withdrawn", label: "Retirées" },
  { id: "all", label: "Toutes" },
] as const;

export default function AdminProfileRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data, isLoading } = useQuery<{ requests: any[] }>({
    queryKey: ["admin-profile-requests", statusFilter],
    queryFn: async () => {
      const res = await fetch(
        `/api/profile-requests/admin/list?status=${encodeURIComponent(statusFilter)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Impossible de charger les demandes");
      return res.json();
    },
  });

  const requests = data?.requests ?? [];
  const active = useMemo(
    () =>
      requests.find((r) => r.id === selectedId) || requests[0] || null,
    [requests, selectedId],
  );

  const stepSelection = (delta: -1 | 1) => {
    if (requests.length === 0) return;
    const idx = active ? requests.findIndex((r) => r.id === active.id) : 0;
    const nextIdx = Math.max(0, Math.min(requests.length - 1, idx + delta));
    setSelectedId(requests[nextIdx].id);
  };

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "POST",
        `/api/profile-requests/admin/${id}/approve`,
        { reviewNote: reviewNote.trim() || undefined },
      );
      return res.json();
    },
    onSuccess: (res) => {
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-profile-requests"] });
      toast({
        title: "Demande approuvée",
        description: `Compte #${res.resultingUserId} / profil artiste #${res.resultingArtistProfileId} prêt (statut contrat: pending).`,
      });
    },
    onError: (err) => {
      toast({
        title: "Erreur d'approbation",
        description: failureFromThrown(err).message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "POST",
        `/api/profile-requests/admin/${id}/reject`,
        { reviewNote: reviewNote.trim() },
      );
      return res.json();
    },
    onSuccess: () => {
      setReviewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-profile-requests"] });
      toast({ title: "Demande refusée" });
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: failureFromThrown(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <TmuShell chrome="site">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 space-y-6">
        <TmuPortalHeader
          title="Validation des liens de profil"
          subtitle="Console propriétaire — approuvez ou refusez les demandes d'import avant toute création de compte."
          icon={<ShieldCheck className="w-5 h-5" />}
          backHref="/admin"
          backLabel="Console Admin"
        />

        <TmuReviewConsoleShell
          queueTitle="Demandes"
          queueCount={requests.length}
          onStepSelection={stepSelection}
          filters={STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setStatusFilter(f.id);
                setSelectedId(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                statusFilter === f.id
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 border-fuchsia-400/50 text-white"
                  : "tmu-glass text-slate-300 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          queueList={
            isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-300 mx-auto" />
              </div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Aucune demande dans cette vue.
              </div>
            ) : (
              requests.map((req) => {
                const isSelected = active?.id === req.id;
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedId(req.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      isSelected
                        ? "bg-purple-500/20 border-l-2 border-l-fuchsia-400"
                        : "hover:bg-purple-500/10 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-white truncate">
                        {req.display_name || req.provider}
                      </span>
                      <TmuStatusChip tone={req.status} label={req.status} />
                    </div>
                    <p className="text-xs text-slate-300 truncate mt-1">
                      {req.requester_email}
                    </p>
                    <p className="text-[11px] text-purple-300 truncate mt-0.5">
                      {req.provider} • {(req.staged_tracks || []).length} piste(s)
                    </p>
                  </button>
                );
              })
            )
          }
          detailPane={
            !active ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <Link2 className="w-10 h-10 text-purple-400/40 mb-2" />
                <p className="text-sm">Sélectionnez une demande à examiner.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-purple-500/20">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-white">
                        {active.display_name || active.provider}
                      </h3>
                      <TmuStatusChip tone={active.status} label={active.status} />
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Demandeur : {active.requester_email}
                    </p>
                    <a
                      href={active.normalized_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-fuchsia-300 hover:underline mt-1"
                    >
                      {active.normalized_url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Snapshot preview */}
                {active.snapshot && (
                  <div className="rounded-2xl border border-purple-500/20 bg-[#090418]/80 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {active.snapshot.avatarUrl ? (
                        <img
                          src={active.snapshot.avatarUrl}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover border border-purple-400/30"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-[#180d34] flex items-center justify-center">
                          <Music className="w-6 h-6 text-purple-300" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {active.snapshot.city && (
                          <p className="text-xs text-slate-300 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-fuchsia-300" />
                            {active.snapshot.city}
                          </p>
                        )}
                        {active.snapshot.bio && (
                          <p className="text-sm text-slate-200 mt-1">
                            {active.snapshot.bio}
                          </p>
                        )}
                        {active.snapshot.externalStats && (
                          <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                            Stats externes ({active.provider}) :{" "}
                            {active.snapshot.externalStats.followersCount ?? 0}{" "}
                            abonnés ·{" "}
                            {active.snapshot.externalStats.trackCount ?? 0} titres
                          </p>
                        )}
                      </div>
                    </div>

                    {Array.isArray(active.staged_tracks) &&
                      active.staged_tracks.length > 0 && (
                        <div className="pt-3 border-t border-purple-500/15 space-y-2">
                          <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                            Brouillons de pistes ({active.staged_tracks.length})
                          </p>
                          {active.staged_tracks.map((t: any) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-3 rounded-xl bg-[#120929] px-3 py-2 border border-purple-500/15"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {t.title}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                  {t.genre || "—"} • {t.license || "—"}
                                </p>
                              </div>
                              <TmuStatusChip
                                tone={
                                  t.status === "attached"
                                    ? "attached"
                                    : "awaiting_audio"
                                }
                                label={t.status}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {active.note && (
                  <div className="rounded-xl border border-purple-500/20 bg-[#120929]/70 p-3 text-sm text-slate-200">
                    <span className="text-xs text-slate-400 block mb-1">
                      Note du demandeur :
                    </span>
                    {active.note}
                  </div>
                )}

                {active.status === "pending" && (
                  <div className="space-y-3 pt-3 border-t border-purple-500/20">
                    <Textarea
                      rows={2}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Note de validation ou motif de refus (requis si refus)…"
                      className="bg-[#090418] border-purple-500/30 text-white placeholder:text-slate-400"
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(active.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Approuver & créer/lier le compte
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          rejectMutation.isPending || reviewNote.trim().length < 3
                        }
                        onClick={() => rejectMutation.mutate(active.id)}
                        className="border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Refuser
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          }
        />
      </div>
    </TmuShell>
  );
}

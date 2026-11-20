import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  MapPin,
  Music,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Link } from "wouter";
import { TmuHubNav } from "@/components/music/TmuHubNav";
import {
  TmuGlassCard,
  TmuPortalHeader,
  TmuStatusChip,
} from "@/components/music/TmuPrimitives";
import { TmuShell } from "@/components/music/TmuShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { failureFromThrown } from "@/lib/submit-json";

interface PreviewTrack {
  externalTrackId: string | null;
  title: string;
  description: string | null;
  genre: string | null;
  durationSec: number | null;
  artworkUrl: string | null;
  externalUrl: string | null;
  license: string | null;
  externalCreatedAt: string | null;
}

interface PreviewSnapshot {
  provider: string;
  normalizedUrl: string;
  sourceTier: string;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  city: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  externalStats?: {
    followersCount?: number;
    followingsCount?: number;
    trackCount?: number;
  };
  tracks: PreviewTrack[];
}

function formatDuration(sec: number | null) {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ProfileRequestPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState("");
  const [requesterEmail, setRequesterEmail] = useState(user?.email || "");
  const [displayName, setDisplayName] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<PreviewSnapshot | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<any | null>(null);

  const mineQuery = useQuery<{
    requests: any[];
    importTracks: any[];
  }>({
    queryKey: ["profile-requests-mine", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/profile-requests/mine", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Impossible de charger vos demandes");
      return res.json();
    },
    enabled: Boolean(user),
  });

  const previewMutation = useMutation({
    mutationFn: async (targetUrl: string) => {
      const res = await apiRequest("POST", "/api/profile-requests/preview", {
        url: targetUrl,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPreview(data.snapshot);
      if (data.snapshot?.displayName && !displayName) {
        setDisplayName(data.snapshot.displayName);
      }
    },
    onError: (err) => {
      toast({
        title: "Lien non reconnu",
        description: failureFromThrown(err).message,
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile-requests", {
        url,
        requesterEmail: (requesterEmail || user?.email || "").trim(),
        displayName: displayName.trim() || undefined,
        note: note.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSubmittedRequest(data);
      queryClient.invalidateQueries({ queryKey: ["profile-requests-mine"] });
      toast({
        title: "Demande envoyée",
        description:
          "Votre demande est en attente de validation par l'équipe Verso Air.",
      });
    },
    onError: (err) => {
      toast({
        title: "Envoi impossible",
        description: failureFromThrown(err).message,
        variant: "destructive",
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/profile-requests/${id}/withdraw`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-requests-mine"] });
      toast({ title: "Demande retirée" });
    },
  });

  const handlePreview = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmittedRequest(null);
    previewMutation.mutate(url.trim());
  };

  return (
    <TmuShell chrome="site">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-6">
        <TmuHubNav currentSurface="artist-portal" />

        <TmuPortalHeader
          title="Importer un profil & demander un compte"
          subtitle="Déposez un lien SoundCloud, Spotify, YouTube ou autre — un administrateur examine puis crée ou relie votre compte artiste."
          icon={<Link2 className="w-5 h-5" />}
          backHref="/artist-portal"
          backLabel="Portail Artiste"
        />

        {/* Step 1: Drop profile link + Preview */}
        <TmuGlassCard elevated className="p-5 sm:p-6 space-y-5">
          <form onSubmit={handlePreview} className="space-y-3">
            <label
              htmlFor="profile-link-input"
              className="block text-sm font-semibold text-slate-100"
            >
              Lien du profil public (https://)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                id="profile-link-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://soundcloud.com/votre-profil"
                required
                className="flex-1 bg-[#090418] border-purple-500/30 text-white placeholder:text-slate-400"
              />
              <Button
                type="submit"
                disabled={previewMutation.isPending || !url.trim()}
                className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shrink-0"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Prévisualiser
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Aucun compte ni titre public n'est créé automatiquement : chaque
              demande reste en attente jusqu'à validation par l'équipe, et vous
              ajoutez vos fichiers audio ensuite.
            </p>
          </form>

          {preview && (
            <div className="rounded-2xl border border-purple-500/25 bg-[#090418]/85 overflow-hidden">
              {preview.bannerUrl && (
                <div className="h-28 sm:h-36 w-full overflow-hidden relative">
                  <img
                    src={preview.bannerUrl}
                    alt=""
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090418] via-transparent to-transparent" />
                </div>
              )}

              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-purple-400/35 bg-[#180d34] shrink-0 flex items-center justify-center">
                    {preview.avatarUrl ? (
                      <img
                        src={preview.avatarUrl}
                        alt={preview.displayName || ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-7 h-7 text-purple-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-white truncate">
                        {preview.displayName || preview.username || "Profil"}
                      </h2>
                      <TmuStatusChip
                        tone="neutral"
                        label={preview.provider.toUpperCase()}
                      />
                      <TmuStatusChip
                        tone="awaiting_audio"
                        label={`Source : ${preview.sourceTier}`}
                      />
                    </div>
                    {preview.city && (
                      <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-fuchsia-300" />
                        {preview.city}
                      </p>
                    )}
                    {preview.bio && (
                      <p className="text-sm text-slate-200 mt-2 whitespace-pre-wrap">
                        {preview.bio}
                      </p>
                    )}
                    {preview.externalStats &&
                      (preview.externalStats.followersCount !== undefined ||
                        preview.externalStats.trackCount !== undefined) && (
                        <p className="text-[11px] text-slate-400 mt-2 tabular-nums">
                          Sur {preview.provider} (référence externe uniquement) :{" "}
                          {preview.externalStats.followersCount ?? 0} abonnés ·{" "}
                          {preview.externalStats.trackCount ??
                            preview.tracks.length}{" "}
                          titres
                        </p>
                      )}
                  </div>
                </div>

                {preview.tracks.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-purple-500/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                      Titres détectés ({preview.tracks.length} brouillons en
                      attente d'audio)
                    </p>
                    <div className="space-y-2">
                      {preview.tracks.map((t, idx) => (
                        <div
                          key={t.externalTrackId || idx}
                          className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-[#120929]/80 p-2.5"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#180d34] shrink-0 flex items-center justify-center">
                            {t.artworkUrl ? (
                              <img
                                src={t.artworkUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-4 h-4 text-purple-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">
                              {t.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate tabular-nums">
                              {t.genre || "Genre non précisé"} •{" "}
                              {formatDuration(t.durationSec)}
                            </p>
                          </div>
                          <TmuStatusChip
                            tone="awaiting_audio"
                            label="En attente d'audio"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Submit pending request */}
          <div className="pt-3 border-t border-purple-500/20 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail du demandeur *
                </label>
                <Input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="bg-[#090418] border-purple-500/30 text-white placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nom de scène souhaité
                </label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: jdcz"
                  className="bg-[#090418] border-purple-500/30 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Note pour l'équipe (optionnel)
              </label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Précisez votre pays ou tout détail utile pour la vérification…"
                className="bg-[#090418] border-purple-500/30 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Statut initial : <strong className="text-amber-300">En attente</strong>
              </span>
              <Button
                type="button"
                disabled={
                  submitMutation.isPending ||
                  !url.trim() ||
                  !(requesterEmail || user?.email || "").trim()
                }
                onClick={() => submitMutation.mutate()}
                className="bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Demander la création / liaison du compte
              </Button>
            </div>
          </div>

          {submittedRequest && (
            <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-100 space-y-1">
                <p className="font-semibold">
                  Demande #{submittedRequest.request?.id} enregistrée (En attente)
                </p>
                <p className="text-xs text-emerald-200/80">
                  {submittedRequest.stagedTracksCount || 0} brouillon(s) de
                  pistes préparés. Un administrateur va examiner votre lien et
                  activer votre profil artiste.
                </p>
              </div>
            </div>
          )}
        </TmuGlassCard>

        {/* Signed-in requester's requests & staged awaiting-audio tracks */}
        {user && (
          <TmuGlassCard className="p-5 sm:p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-50 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-300" />
              Mes demandes & brouillons en attente d'audio
            </h2>

            {mineQuery.isLoading ? (
              <div className="py-6 text-center text-slate-400 text-sm">
                Chargement…
              </div>
            ) : (
              <>
                {(mineQuery.data?.requests?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-400">
                    Aucune demande soumise pour ce compte pour le moment.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {mineQuery.data?.requests.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-500/20 bg-[#090418]/75 p-3.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              {r.display_name || r.provider}
                            </span>
                            <TmuStatusChip
                              tone={r.status}
                              label={r.status.toUpperCase()}
                            />
                          </div>
                          <a
                            href={r.normalized_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-fuchsia-300 mt-1 truncate max-w-full"
                          >
                            <span className="truncate">{r.normalized_url}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          {r.review_note && (
                            <p className="text-xs text-slate-300 mt-1">
                              Note staff : {r.review_note}
                            </p>
                          )}
                        </div>
                        {r.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={withdrawMutation.isPending}
                            onClick={() => withdrawMutation.mutate(r.id)}
                            className="border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Retirer
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(mineQuery.data?.importTracks?.length ?? 0) > 0 && (
                  <div className="pt-4 border-t border-purple-500/20 space-y-2.5">
                    <h3 className="text-sm font-semibold text-purple-200">
                      Pistes importées (ajoutez votre fichier audio pour publier)
                    </h3>
                    {mineQuery.data?.importTracks.map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-500/20 bg-[#120929]/70 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {t.artwork_url ? (
                            <img
                              src={t.artwork_url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#180d34] flex items-center justify-center shrink-0">
                              <Music className="w-4 h-4 text-purple-300" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {t.title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {t.genre || "—"} • {formatDuration(t.duration_sec)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TmuStatusChip
                            tone={t.status === "attached" ? "attached" : "awaiting_audio"}
                            label={
                              t.status === "attached"
                                ? "Audio rattaché"
                                : "En attente d'audio"
                            }
                          />
                          {t.status === "awaiting_audio" && (
                            <Link href={`/music/vault?importTrackId=${t.id}`}>
                              <Button
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                              >
                                <Upload className="w-3.5 h-3.5 mr-1" />
                                Déposer l'audio
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TmuGlassCard>
        )}
      </div>
    </TmuShell>
  );
}

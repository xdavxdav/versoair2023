/**
 * MusicLibrary — My Library page for Musical Universe
 * Shows saved tracks, playlists, albums, recently played, and offline downloaded tracks
 */
import { motion } from "framer-motion";
import {
  Library,
  Play,
  Heart,
  Clock,
  Music2,
  ListMusic,
  Disc3,
  Plus,
  Search,
  X,
  Download,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { MusicLayout } from "@/layouts/MusicLayout";
import { MusicSectionCard, MusicEmptyState } from "@/components/music";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAudio } from "@/lib/audio-context";
import {
  usePlaylists,
  usePlaylistDetail,
  useCreatePlaylist,
  useLikedTracks,
  useListeningHistory,
} from "@/hooks/use-streaming";
import { useMusicAlbums } from "@/hooks/use-music";
import { useState, useEffect, useCallback } from "react";
import {
  getOfflineTracks,
  removeOfflineTrack,
  downloadTrackToDevice,
  getOfflineStorageEstimate,
  downloadBatchTracks,
  type OfflineTrackRecord,
} from "@/lib/offline-storage";
import { toast } from "@/hooks/use-toast";

/* ─── Tab types ─── */
type LibraryTab =
  | "all"
  | "playlists"
  | "albums"
  | "tracks"
  | "recent"
  | "offline";

const TABS: {
  id: LibraryTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "Tout", icon: Library },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "albums", label: "Albums", icon: Disc3 },
  { id: "tracks", label: "Titres", icon: Music2 },
  { id: "offline", label: "Hors-ligne", icon: Download },
  { id: "recent", label: "Récents", icon: Clock },
];

export default function MusicLibrary() {
  const { user } = useAuthContext();
  const audio = useAudio();
  const [activeTab, setActiveTab] = useState<LibraryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [offlineTracks, setOfflineTracks] = useState<OfflineTrackRecord[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(
    null,
  );

  const [storageStats, setStorageStats] = useState<{
    usageBytes: number;
    quotaBytes: number;
    trackCount: number;
  }>({ usageBytes: 0, quotaBytes: 1024 * 1024 * 1024, trackCount: 0 });
  const [batchProgress, setBatchProgress] = useState<{
    running: boolean;
    completed: number;
    total: number;
    title: string;
  }>({ running: false, completed: 0, total: 0, title: "" });

  const { data: playlistsData } = usePlaylists();
  const { data: likedData } = useLikedTracks();
  const { data: historyData } = useListeningHistory();
  const { data: albumsData } = useMusicAlbums();
  const { data: playlistDetail } = usePlaylistDetail(selectedPlaylist || 0);
  const createPlaylist = useCreatePlaylist();

  const loadOffline = useCallback(async () => {
    const list = await getOfflineTracks();
    setOfflineTracks(list);
    const stats = await getOfflineStorageEstimate();
    setStorageStats(stats);
  }, []);

  useEffect(() => {
    loadOffline();
    window.addEventListener("offline-tracks-changed", loadOffline);
    return () =>
      window.removeEventListener("offline-tracks-changed", loadOffline);
  }, [loadOffline]);

  const playlists = Array.isArray(playlistsData?.playlists)
    ? playlistsData.playlists
    : [];
  const likedTracks = Array.isArray(likedData?.tracks) ? likedData.tracks : [];
  const history = Array.isArray(historyData?.history)
    ? historyData.history
    : [];
  const albums = Array.isArray((albumsData as any)?.data)
    ? (albumsData as any).data
    : Array.isArray(albumsData)
      ? albumsData
      : [];
  const playlistTracks =
    playlistDetail?.tracks || playlistDetail?.playlist?.tracks || [];

  const visibleLiked = likedTracks.filter(
    (track: any) =>
      !searchQuery ||
      `${track.title} ${track.artist_name || track.artistName || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const visibleOffline = offlineTracks.filter(
    (track) =>
      !searchQuery ||
      `${track.title} ${track.artistName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const handleDownload = async (track: any) => {
    const trackId = track.id;
    setDownloadingId(trackId);
    try {
      await downloadTrackToDevice(
        trackId,
        track.title || "Track",
        track.artist_name || track.artistName || "Artist",
      );
      toast({
        title: "Titre téléchargé",
        description: `"${track.title}" est prêt pour l'écoute hors-ligne.`,
      });
      loadOffline();
    } catch (err: any) {
      toast({
        title: "Erreur de téléchargement",
        description: err.message || "Impossible de télécharger le titre.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRemoveOffline = async (trackId: string | number) => {
    await removeOfflineTrack(trackId);
    loadOffline();
    toast({
      title: "Supprimé du stockage local",
      description: "Le titre a été retiré de vos fichiers hors-ligne.",
    });
  };

  const handleBatchDownload = async (
    tracksToDownload: Array<any>,
    label = "la sélection",
  ) => {
    if (!tracksToDownload || tracksToDownload.length === 0) {
      toast({
        title: "Aucun titre à télécharger",
        description: "La liste est vide.",
      });
      return;
    }

    setBatchProgress({
      running: true,
      completed: 0,
      total: tracksToDownload.length,
      title: tracksToDownload[0]?.title || "",
    });

    try {
      const result = await downloadBatchTracks(
        tracksToDownload.map((t) => ({
          id: t.id,
          title: t.title || "Titre",
          artistName: t.artist_name || t.artistName || "Artiste",
          coverArt: t.cover_art || t.pochette || t.coverArt,
          duration: t.duration,
        })),
        (completed, total, title) => {
          setBatchProgress({
            running: completed < total,
            completed,
            total,
            title,
          });
        },
      );

      toast({
        title: "Téléchargement groupé terminé",
        description: `${result.successful} titre(s) enregistré(s) pour l'écoute hors-ligne.`,
      });
      loadOffline();
    } catch (err: any) {
      toast({
        title: "Erreur pendant le téléchargement",
        description: err?.message || "Impossible de finaliser le lot.",
        variant: "destructive",
      });
    } finally {
      setBatchProgress({ running: false, completed: 0, total: 0, title: "" });
    }
  };

  const makePlaylist = () => {
    if (!playlistName.trim()) return;
    createPlaylist.mutate(
      { name: playlistName.trim() },
      {
        onSuccess: () => {
          setPlaylistName("");
          setShowCreate(false);
        },
      },
    );
  };

  return (
    <MusicLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Library className="w-7 h-7 text-purple-400" />
              Ma Bibliothèque
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Vos titres sauvegardés, playlists, albums et téléchargements
              hors-ligne
            </p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/25 gap-2 w-fit"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Playlist
          </Button>
        </motion.div>

        {/* Search + Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans ma bibliothèque..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    activeTab === tab.id
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.id === "offline" && offlineTracks.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-purple-500/30 text-[10px] text-purple-200">
                      {offlineTracks.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {showCreate && (
          <div className="rounded-xl border border-purple-500/30 bg-white/[0.05] p-4 flex gap-3 items-center">
            <input
              autoFocus
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              placeholder="Nom de la playlist"
              className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-white"
            />
            <Button onClick={makePlaylist} disabled={createPlaylist.isPending}>
              Créer
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCreate(false)}
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Storage Quota & Batch Indicator Bar */}
        {(activeTab === "all" || activeTab === "offline") && (
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-purple-200">
                <Download className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">Stockage Hors-Ligne:</span>
                <span className="text-white font-medium">
                  {(storageStats.usageBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
                <span className="text-white/40">
                  / {(storageStats.quotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                </span>
                <span className="text-xs text-purple-300/60">
                  ({storageStats.trackCount} titre{storageStats.trackCount > 1 ? "s" : ""})
                </span>
              </div>

              {likedTracks.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchDownload(likedTracks, "Coups de cœur")}
                  disabled={batchProgress.running}
                  className="border-purple-500/30 hover:bg-purple-500/20 text-purple-200 text-xs gap-1.5 h-8"
                >
                  {batchProgress.running ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Télécharger Coups de cœur ({likedTracks.length})
                </Button>
              )}
            </div>

            {/* Storage usage bar */}
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      3,
                      (storageStats.usageBytes / storageStats.quotaBytes) * 100,
                    ),
                  )}%`,
                }}
              />
            </div>

            {/* Batch progress banner */}
            {batchProgress.running && (
              <div className="flex items-center gap-2 text-xs text-purple-300 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>
                  Téléchargement ({batchProgress.completed}/{batchProgress.total}):{" "}
                  <strong className="text-white">{batchProgress.title}</strong>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Offline / Downloaded Tracks */}
        {(activeTab === "all" || activeTab === "offline") && (
          <MusicSectionCard
            title="Titres hors-ligne (Téléchargés)"
            icon={Download}
          >
            {visibleOffline.length ? (
              <div className="space-y-2">
                {visibleOffline.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-950/10 p-3 hover:bg-purple-950/20 transition-all"
                  >
                    <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden text-purple-300 font-bold">
                      {track.coverArt ? (
                        <img
                          src={track.coverArt}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Music2 className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white flex items-center gap-1.5">
                        {track.title}
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 inline shrink-0" />
                      </p>
                      <p className="truncate text-xs text-white/40">
                        {track.artistName} ·{" "}
                        {(track.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg h-8 w-8"
                        onClick={() =>
                          audio.playTrack({
                            id:
                              typeof track.id === "string"
                                ? parseInt(track.id, 10) || 0
                                : track.id,
                            title: track.title,
                            duration: track.duration || 0,
                            artist_name: track.artistName,
                            pochette: track.coverArt,
                            audio_url: URL.createObjectURL(track.audioBlob),
                          })
                        }
                      >
                        <Play className="h-4 w-4 fill-white" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-8 w-8"
                        onClick={() => handleRemoveOffline(track.id)}
                        title="Retirer du cache hors-ligne"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <MusicEmptyState
                icon={Download}
                title="Aucun titre téléchargé"
                description="Téléchargez vos morceaux préférés pour les écouter même sans connexion internet."
                action={{ label: "Découvrir la musique", href: "/stream" }}
              />
            )}
          </MusicSectionCard>
        )}

        {/* Albums with Pochette */}
        {(activeTab === "all" || activeTab === "albums") && (
          <MusicSectionCard title="Albums & Sorties" icon={Disc3}>
            {albums.length ? (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {albums.map((album: any) => {
                  const pochetteSrc =
                    album.pochette ||
                    (album.has_pochette
                      ? `/api/streaming/albums/${album.id}/pochette`
                      : null) ||
                    album.cover_art ||
                    album.coverArt;

                  return (
                    <div
                      key={album.id}
                      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-all cursor-pointer"
                    >
                      <div className="relative aspect-square w-full rounded-xl bg-purple-900/30 overflow-hidden mb-2.5 border border-white/5">
                        {pochetteSrc ? (
                          <img
                            src={pochetteSrc}
                            alt={album.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-purple-400/40">
                            <Disc3 className="h-10 w-10" />
                          </div>
                        )}
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white/90">
                          {album.total_tracks || album.track_count || 0} titres
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {album.title}
                      </p>
                      <p className="truncate text-xs text-white/40">
                        {album.artist_name || album.genre || "Album"}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <MusicEmptyState
                icon={Disc3}
                title="Aucun album sauvegardé"
                description="Parcourez le catalogue et sauvegardez vos albums préférés."
                action={{
                  label: "Découvrir",
                  href: "/stream",
                }}
              />
            )}
          </MusicSectionCard>
        )}

        {/* Playlists */}
        {(activeTab === "all" || activeTab === "playlists") && (
          <MusicSectionCard title="Mes Playlists" icon={ListMusic}>
            {selectedPlaylist ? (
              <div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedPlaylist(null)}
                  className="mb-3 text-purple-300"
                >
                  ← Retour aux playlists
                </Button>
                <div className="space-y-2">
                  {playlistTracks.map((track: any) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      onPlay={() => audio.playTrack(track)}
                      onDownload={() => handleDownload(track)}
                      isDownloading={downloadingId === track.id}
                    />
                  ))}
                </div>
              </div>
            ) : playlists.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {playlists.map((playlist: any) => (
                  <button
                    key={playlist.id}
                    onClick={() => setSelectedPlaylist(playlist.id)}
                    className="text-left rounded-xl border border-white/10 p-4 hover:bg-white/[0.05] transition-colors"
                  >
                    <ListMusic className="h-5 w-5 text-purple-300" />
                    <p className="mt-2 text-white font-medium">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-white/40">
                      {playlist.track_count || 0} titres
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <MusicEmptyState
                icon={ListMusic}
                title="Aucune playlist encore"
                description="Créez votre première playlist et commencez à organiser votre musique."
                action={{
                  label: "Créer une playlist",
                  onClick: () => setShowCreate(true),
                }}
              />
            )}
          </MusicSectionCard>
        )}

        {/* Liked Tracks */}
        {(activeTab === "all" || activeTab === "tracks") && (
          <MusicSectionCard title="Titres aimés" icon={Heart}>
            {visibleLiked.length ? (
              <div className="space-y-2">
                {visibleLiked.map((track: any) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    onPlay={() => audio.playTrack(track)}
                    onDownload={() => handleDownload(track)}
                    isDownloading={downloadingId === track.id}
                  />
                ))}
              </div>
            ) : (
              <MusicEmptyState
                icon={Heart}
                title="Aucun titre aimé"
                description="Appuyez sur ❤️ pour sauvegarder vos morceaux favoris ici."
                action={{ label: "Écouter de la musique", href: "/stream" }}
              />
            )}
          </MusicSectionCard>
        )}

        {/* Recently Played */}
        {(activeTab === "all" || activeTab === "recent") && (
          <MusicSectionCard title="Écoutés récemment" icon={Clock}>
            {history.length ? (
              <div className="space-y-2">
                {history.slice(0, 10).map((entry: any) => (
                  <div
                    key={`${entry.track_id}-${entry.played_at}`}
                    className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3"
                  >
                    <Clock className="h-4 w-4 text-white/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {entry.title}
                      </p>
                      <p className="text-xs text-white/40 truncate">
                        {entry.artist_name || "Artiste"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <MusicEmptyState
                icon={Clock}
                title="Aucun historique"
                description="Vos pistes écoutées apparaîtront ici."
              />
            )}
          </MusicSectionCard>
        )}
      </div>
    </MusicLayout>
  );
}

function TrackRow({
  track,
  onPlay,
  onDownload,
  isDownloading,
}: {
  track: any;
  onPlay: () => void;
  onDownload?: () => void;
  isDownloading?: boolean;
}) {
  const pochette =
    track.pochette ||
    (track.has_pochette
      ? `/api/streaming/tracks/${track.id}/pochette`
      : null) ||
    track.cover_art ||
    track.coverArt;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors">
      <div className="h-10 w-10 rounded-lg bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
        {pochette ? (
          <img src={pochette} alt="" className="h-full w-full object-cover" />
        ) : (
          <Music2 className="h-5 w-5 text-white/30" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{track.title}</p>
        <p className="truncate text-xs text-white/40">
          {track.artist_name || track.artistName || "Artiste"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {onDownload && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onDownload}
            disabled={isDownloading}
            className="text-white/40 hover:text-white rounded-lg h-8 w-8"
            title="Télécharger hors-ligne"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button
          size="icon"
          onClick={onPlay}
          className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg h-8 w-8"
          aria-label={`Lire ${track.title}`}
        >
          <Play className="h-4 w-4 fill-white" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Library Page — /library
 * User playlists, liked songs, listening history
 */
import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAudio } from "@/lib/audio-context";
import {
  usePlaylists,
  usePlaylistDetail,
  useCreatePlaylist,
  useLikedTracks,
  useListeningHistory,
} from "@/hooks/use-streaming";
import {
  Play,
  Pause,
  Music,
  Heart,
  Clock,
  Plus,
  ListMusic,
  ChevronLeft,
  Shuffle,
  Trash2,
  Edit3,
  MoreHorizontal,
  History,
  Headphones,
  Star,
  X,
  Check,
} from "lucide-react";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatStreams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

type Tab = "playlists" | "liked" | "history";

export default function LibraryPage() {
  const audio = useAudio();
  const [activeTab, setActiveTab] = useState<Tab>("playlists");
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");

  const { data: playlistsData } = usePlaylists();
  const { data: selectedPlaylistData } = usePlaylistDetail(
    selectedPlaylist || 0,
  );
  const { data: likedData } = useLikedTracks();
  const { data: historyData } = useListeningHistory();
  const createPlaylist = useCreatePlaylist();

  // Defensive normalization: ensure we always have arrays
  const playlists = Array.isArray(playlistsData)
    ? playlistsData
    : Array.isArray(playlistsData?.playlists)
      ? playlistsData.playlists
      : [];
  const likedTracks = Array.isArray(likedData)
    ? likedData
    : Array.isArray(likedData?.tracks)
      ? likedData.tracks
      : [];
  const history = Array.isArray(historyData)
    ? historyData
    : Array.isArray(historyData?.history)
      ? historyData.history
      : [];
  const selectedPlaylistMeta =
    selectedPlaylistData?.playlist ?? selectedPlaylistData ?? null;
  const selectedPlaylistTracks =
    selectedPlaylistData?.tracks ?? selectedPlaylistMeta?.tracks ?? [];

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    createPlaylist.mutate(
      {
        name: newPlaylistName.trim(),
        description: newPlaylistDesc.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewPlaylistName("");
          setNewPlaylistDesc("");
        },
      },
    );
  };

  const tabs = [
    {
      key: "playlists" as Tab,
      label: "Playlists",
      icon: ListMusic,
      count: playlists.length,
    },
    {
      key: "liked" as Tab,
      label: "Titres aimés",
      icon: Heart,
      count: likedTracks.length,
    },
    {
      key: "history" as Tab,
      label: "Historique",
      icon: History,
      count: history.length,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-28">
      {/* Header */}
      <div className="max-w-[95vw] mx-auto px-4 pt-6">
        <Link href="/stream">
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" />
            Stream
          </button>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
              Ma Bibliothèque
            </h1>
            <p className="text-gray-500 text-sm">
              Vos playlists, favoris et historique
            </p>
          </div>
          {activeTab === "playlists" && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-sm hover:bg-amber-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nouvelle playlist
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800/30 rounded-lg p-1 mb-6 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedPlaylist(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm transition-all ${
                activeTab === tab.key
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.key
                    ? "bg-amber-500/30 text-amber-300"
                    : "bg-gray-700 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* PLAYLISTS TAB */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === "playlists" && !selectedPlaylist && (
        <div className="max-w-[95vw] mx-auto px-4">
          {playlists.length === 0 ? (
            <div className="text-center py-16">
              <ListMusic className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Aucune playlist encore</p>
              <p className="text-gray-600 text-sm mb-4">
                Créez votre première playlist pour organiser vos titres préférés
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
              >
                Créer une playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {/* Liked songs quick access */}
              <div
                onClick={() => setActiveTab("liked")}
                className="group cursor-pointer"
              >
                <div className="aspect-square rounded-xl bg-gradient-to-br from-red-600 to-pink-700 flex items-center justify-center shadow-lg mb-2">
                  <Heart className="w-12 h-12 text-white/60 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-white text-sm font-medium">Titres aimés</p>
                <p className="text-gray-500 text-xs">
                  {likedTracks.length} titres
                </p>
              </div>

              {playlists.map((pl: any) => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylist(pl.id)}
                  className="group cursor-pointer"
                >
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-lg mb-2 overflow-hidden relative">
                    {pl.cover_image ? (
                      <img
                        src={pl.cover_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="grid grid-cols-2 w-full h-full">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="bg-gray-800 border border-gray-700/30 flex items-center justify-center"
                          >
                            <Music className="w-6 h-6 text-gray-600" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-end justify-end p-2">
                      <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 text-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium truncate">
                    {pl.name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {pl.track_count || 0} titres
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected playlist detail */}
      {activeTab === "playlists" &&
        selectedPlaylist &&
        selectedPlaylistMeta && (
          <div className="max-w-[95vw] mx-auto px-4">
            <button
              onClick={() => setSelectedPlaylist(null)}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              Mes playlists
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                <ListMusic className="w-10 h-10 text-gray-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {selectedPlaylistMeta.name}
                </h2>
                {selectedPlaylistMeta.description && (
                  <p className="text-gray-500 text-sm mt-1">
                    {selectedPlaylistMeta.description}
                  </p>
                )}
                <p className="text-gray-600 text-xs mt-1">
                  {selectedPlaylistTracks.length} titres
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() =>
                      selectedPlaylistTracks.length &&
                      audio.playTracks(selectedPlaylistTracks)
                    }
                    className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 text-sm flex items-center gap-1.5"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> Lecture aléatoire
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-0.5">
              {selectedPlaylistTracks.map((track: any, i: number) => {
                const isCurrent = audio.currentTrack?.id === track.id;
                return (
                  <div
                    key={`${track.id}-${i}`}
                    onClick={() => audio.playTrack(track)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer group transition-all ${
                      isCurrent ? "bg-amber-500/10" : "hover:bg-gray-800/50"
                    }`}
                  >
                    <span
                      className={`w-6 text-center text-xs ${isCurrent ? "text-amber-400 font-bold" : "text-gray-600"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                      {track.cover_art ? (
                        <img
                          src={track.cover_art}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                          <Music className="w-4 h-4 text-white/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${isCurrent ? "text-amber-400" : "text-white"}`}
                      >
                        {track.title}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {track.artist_name}
                      </p>
                    </div>
                    <span className="text-gray-600 text-xs w-10 text-right">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* ═══════════════════════════════════════════ */}
      {/* LIKED TRACKS TAB */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === "liked" && (
        <div className="max-w-[95vw] mx-auto px-4">
          {likedTracks.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Aucun titre aimé</p>
              <p className="text-gray-600 text-sm">
                Appuyez sur ❤️ sur un titre pour l'ajouter ici
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => audio.playTracks(likedTracks)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 text-sm"
                >
                  <Shuffle className="w-3.5 h-3.5" /> Tout écouter
                </button>
                <span className="text-gray-500 text-sm">
                  {likedTracks.length} titres
                </span>
              </div>
              <div className="space-y-0.5">
                {likedTracks.map((track: any, i: number) => {
                  const isCurrent = audio.currentTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => audio.playTrack(track)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer group transition-all ${
                        isCurrent ? "bg-amber-500/10" : "hover:bg-gray-800/50"
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 text-red-400 fill-current flex-shrink-0" />
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                        {track.cover_art ? (
                          <img
                            src={track.cover_art}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                            <Music className="w-4 h-4 text-white/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${isCurrent ? "text-amber-400" : "text-white"}`}
                        >
                          {track.title}
                        </p>
                        <p className="text-gray-500 text-xs truncate">
                          {track.artist_name}
                        </p>
                      </div>
                      <span className="text-gray-600 text-xs hidden sm:inline">
                        {formatStreams(track.streams || 0)}
                      </span>
                      <span className="text-gray-600 text-xs w-10 text-right">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* HISTORY TAB */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="max-w-[95vw] mx-auto px-4">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Aucun historique</p>
              <p className="text-gray-600 text-sm">
                Écoutez de la musique pour voir votre historique ici
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {history.map((entry: any, i: number) => {
                const isCurrent = audio.currentTrack?.id === entry.track_id;
                return (
                  <div
                    key={`${entry.id || i}`}
                    onClick={() => entry.track && audio.playTrack(entry.track)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer group transition-all ${
                      isCurrent ? "bg-amber-500/10" : "hover:bg-gray-800/50"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                      <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                        <Music className="w-4 h-4 text-white/40" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${isCurrent ? "text-amber-400" : "text-white"}`}
                      >
                        {entry.track?.title || entry.title || "Titre inconnu"}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {entry.track?.artist_name ||
                          entry.artist_name ||
                          "Artiste inconnu"}
                      </p>
                    </div>
                    <span className="text-gray-600 text-xs">
                      {entry.played_at ? timeAgo(entry.played_at) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* CREATE PLAYLIST MODAL */}
      {/* ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Nouvelle playlist</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nom de la playlist"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 mb-3"
                autoFocus
              />
              <textarea
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                placeholder="Description (optionnel)"
                rows={2}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 mb-4 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || createPlaylist.isPending}
                  className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 text-sm disabled:opacity-40"
                >
                  Créer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

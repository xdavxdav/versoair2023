/**
 * Track Detail Page — /track/:id
 * Full track info, comments, related tracks, album context
 */
import { useState } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAudio } from "@/lib/audio-context";
import {
  useTrackDetail,
  useToggleLike,
  useAddComment,
  useUserLikedTrackIds,
} from "@/hooks/use-streaming";
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  Music,
  Disc3,
  ChevronLeft,
  Send,
  Plus,
  BarChart3,
  Headphones,
  Star,
  ListMusic,
  Users,
  ExternalLink,
  Shuffle,
  MoreHorizontal,
} from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
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
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j`;
  return `${Math.floor(days / 30)}mo`;
}

export default function TrackDetailPage() {
  const [, params] = useRoute("/track/:id");
  const trackId = params?.id ? parseInt(params.id) : 0;
  const audio = useAudio();

  const { data, isLoading } = useTrackDetail(trackId);
  const { data: likedIds } = useUserLikedTrackIds();
  const likeMutation = useToggleLike();
  const commentMutation = useAddComment();

  const [comment, setComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  const track = data?.track;
  const comments = data?.comments || [];
  const related = data?.related || [];
  const albumTracks = data?.albumTracks || [];

  const isPlaying = audio.currentTrack?.id === trackId && audio.isPlaying;
  const isLiked = likedIds?.includes(trackId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full"
        />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center text-white">
        <Music className="w-16 h-16 text-gray-700 mb-4" />
        <p className="text-gray-400">Titre introuvable</p>
        <Link href="/stream">
          <button className="mt-4 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm">
            Retour au catalogue
          </button>
        </Link>
      </div>
    );
  }

  const handleLike = () => {
    likeMutation.mutate(trackId);
  };

  const handleComment = () => {
    if (!comment.trim()) return;
    commentMutation.mutate(
      { trackId, content: comment.trim() },
      {
        onSuccess: () => setComment(""),
      },
    );
  };

  const handlePlay = () => {
    if (isPlaying) {
      audio.togglePlay();
    } else {
      audio.playTrack(track);
    }
  };

  const handlePlayAlbum = () => {
    if (albumTracks.length > 0) {
      audio.playTracks(albumTracks);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/music/tracks/${trackId}/stream`);
      if (!response.ok) throw new Error("fetch failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${track.title} - ${track.artist_name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // iOS Safari / restricted browsers — show instructions
      alert(
        "Download blocked by your browser.\n\niOS: Press play → tap the share icon → Save to Files.\nAndroid: Long-press the audio player → Save audio.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-28">
      {/* Back nav */}
      <div className="max-w-[95vw] mx-auto px-4 pt-6">
        <Link href="/stream">
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-6">
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
        </Link>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* HERO: Track Info + Play */}
      {/* ═══════════════════════════════════════════ */}
      <section className="max-w-[95vw] mx-auto px-4 mb-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Album Art */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-shrink-0"
          >
            <div className="w-64 h-64 md:w-72 md:h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl shadow-black/60 mx-auto md:mx-0 relative group">
              <img
                src={
                  track.cover_art ||
                  track.album_cover ||
                  track.pochette ||
                  "/default-music.png"
                }
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fb) {
                    img.dataset.fb = "1";
                    img.src = "/default-music.png";
                  } else img.style.display = "none";
                }}
              />
              {/* Play overlay on art */}
              <div
                onClick={handlePlay}
                className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer"
              >
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/40">
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-black" />
                  ) : (
                    <Play className="w-7 h-7 text-black ml-1" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Track Info */}
          <div className="flex-1 flex flex-col justify-center">
            {track.is_explicit && (
              <span className="inline-block w-fit px-2 py-0.5 bg-gray-700 text-gray-400 text-[10px] rounded uppercase mb-2 font-bold tracking-wider">
                Explicite
              </span>
            )}
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {track.title}
            </h1>

            <Link href={`/artist-catalogue/${track.artist_id}`}>
              <p className="text-amber-400 text-lg hover:text-amber-300 cursor-pointer transition-colors inline-flex items-center gap-1.5 mb-3">
                {track.artist_name}
                {track.artist_verified && <Star className="w-4 h-4" />}
              </p>
            </Link>

            {track.album_title && (
              <p className="text-gray-500 text-sm mb-4 flex items-center gap-1.5">
                <Disc3 className="w-3.5 h-3.5" />
                {track.album_title}
                {track.track_number && ` • Piste ${track.track_number}`}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-6 text-gray-500 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{" "}
                {formatDuration(track.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Headphones className="w-3.5 h-3.5" />{" "}
                {formatStreams(track.streams || 0)} streams
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {track.likes || 0} likes
              </span>
              {track.genre && (
                <span className="px-2 py-0.5 bg-gray-800 rounded-full text-xs">
                  {track.genre}
                </span>
              )}
              {track.mood && (
                <span className="px-2 py-0.5 bg-gray-800 rounded-full text-xs">
                  {track.mood}
                </span>
              )}
              {track.bpm && (
                <span className="px-2 py-0.5 bg-gray-800 rounded-full text-xs">
                  {track.bpm} BPM
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePlay}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl flex items-center gap-2 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
                {isPlaying ? "Pause" : "Écouter"}
              </motion.button>

              <button
                onClick={handleLike}
                className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 border transition-all ${
                  isLiked
                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                    : "bg-gray-800/50 text-gray-400 border-gray-700 hover:text-red-400 hover:border-red-500/30"
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? "Aimé" : "J'aime"}
              </button>

              <button
                onClick={() => audio.addToQueue(track)}
                className="px-4 py-2.5 bg-gray-800/50 text-gray-400 border border-gray-700 rounded-xl hover:text-white hover:border-gray-600 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                File d'attente
              </button>

              <button
                onClick={() =>
                  navigator
                    .share?.({ title: track.title, url: window.location.href })
                    .catch(() =>
                      navigator.clipboard?.writeText(window.location.href),
                    )
                }
                className="px-4 py-2.5 bg-gray-800/50 text-gray-400 border border-gray-700 rounded-xl hover:text-white hover:border-gray-600 flex items-center gap-1.5 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Partager
              </button>

              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-4 py-2.5 bg-gray-800/50 text-gray-400 border border-gray-700 rounded-xl hover:text-amber-400 hover:border-amber-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />{" "}
                    Téléchargement…
                  </>
                ) : (
                  <>
                    <MoreHorizontal className="w-4 h-4" /> Télécharger
                  </>
                )}
              </button>

              {track.wiki_url && (
                <a
                  href={track.wiki_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-gray-800/50 text-gray-400 border border-gray-700 rounded-xl hover:text-white hover:border-gray-600 flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Wiki
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* LYRICS (if present) */}
      {/* ═══════════════════════════════════════════ */}
      {track.lyrics && (
        <section className="max-w-[95vw] mx-auto px-4 mb-10">
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/40">
            <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
              <Music className="w-4 h-4" />
              Paroles
            </h3>
            <p className="text-gray-300 text-sm whitespace-pre-line leading-relaxed">
              {track.lyrics}
            </p>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ALBUM TRACKS */}
      {/* ═══════════════════════════════════════════ */}
      {albumTracks.length > 1 && (
        <section className="max-w-[95vw] mx-auto px-4 mb-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <ListMusic className="w-4 h-4 text-amber-400" />
              {track.album_title || "Album"}
            </h3>
            <button
              onClick={handlePlayAlbum}
              className="text-amber-400 text-xs hover:text-amber-300 flex items-center gap-1"
            >
              <Shuffle className="w-3 h-3" />
              Tout écouter
            </button>
          </div>
          <div className="bg-gray-800/20 rounded-xl overflow-hidden">
            {albumTracks.map((at: any, i: number) => {
              const isCurrent = audio.currentTrack?.id === at.id;
              return (
                <div
                  key={at.id}
                  onClick={() => audio.playTrack(at)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    isCurrent ? "bg-amber-500/10" : "hover:bg-gray-800/50"
                  } ${i > 0 ? "border-t border-gray-800/50" : ""}`}
                >
                  <span
                    className={`w-6 text-center text-xs ${isCurrent ? "text-amber-400 font-bold" : "text-gray-600"}`}
                  >
                    {at.track_number || i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${isCurrent ? "text-amber-400" : "text-white"}`}
                    >
                      {at.title}
                    </p>
                  </div>
                  <span className="text-gray-600 text-xs">
                    {formatStreams(at.streams || 0)}
                  </span>
                  <span className="text-gray-600 text-xs w-10 text-right">
                    {formatDuration(at.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* COMMENTS */}
      {/* ═══════════════════════════════════════════ */}
      <section className="max-w-[95vw] mx-auto px-4 mb-10">
        <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-4">
          <MessageCircle className="w-4 h-4 text-amber-400" />
          Commentaires ({comments.length})
        </h3>

        {/* Comment input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            placeholder="Laissez un commentaire..."
            className="flex-1 px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          <button
            onClick={handleComment}
            disabled={!comment.trim() || commentMutation.isPending}
            className="px-4 py-2.5 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 disabled:opacity-40 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Comments list */}
        <div className="space-y-2">
          {(showAllComments ? comments : comments.slice(0, 5)).map((c: any) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 p-3 rounded-lg bg-gray-800/20"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {(c.username || "U")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">
                    {c.username || "Utilisateur"}
                  </span>
                  <span className="text-gray-600 text-[10px]">
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm break-words whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
            </motion.div>
          ))}
          {comments.length > 5 && !showAllComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-amber-400 text-sm hover:text-amber-300 transition-colors"
            >
              Voir les {comments.length - 5} autres commentaires
            </button>
          )}
          {comments.length === 0 && (
            <p className="text-gray-600 text-sm text-center py-6">
              Soyez le premier à commenter ✨
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* RELATED TRACKS */}
      {/* ═══════════════════════════════════════════ */}
      {related.length > 0 && (
        <section className="max-w-[95vw] mx-auto px-4 mb-16">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-4">
            <Shuffle className="w-4 h-4 text-amber-400" />
            Titres similaires
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {related.map((r: any) => (
              <div
                key={r.id}
                onClick={() => audio.playTrack(r)}
                className="group cursor-pointer bg-gray-800/20 rounded-lg p-3 hover:bg-gray-800/40 transition-all"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800 mb-2">
                  {r.cover_art || r.album_cover ? (
                    <img
                      src={r.cover_art || r.album_cover}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                      <Music className="w-6 h-6 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end justify-end p-2 transition-all">
                    <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 text-black ml-0.5" />
                    </div>
                  </div>
                </div>
                <p className="text-white text-xs font-medium truncate">
                  {r.title}
                </p>
                <p className="text-gray-500 text-[10px] truncate">
                  {r.artist_name}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Artist Catalogue Page — /artist-catalogue/:id
 * Full artist profile: bio, discography, stats, social
 */
import { useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useAudio } from "@/lib/audio-context";
import ThreadFeedWidget from "@/components/ThreadFeedWidget";
import { TmuHubNav } from "@/components/music/TmuHubNav";
import { TmuShell } from "@/components/music/TmuShell";
import { getFeaturedArtistByName } from "@shared/featured-artists";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useArtistDetail,
  useToggleFollow,
  useUserFollowing,
  useArtistAnalytics,
} from "@/hooks/use-streaming";
import { useAuthContext } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";
import {
  nextSendAttempt,
  settleSendAttempt,
  type SendAttempt,
} from "@/lib/inbox-api";
import {
  Play,
  Pause,
  Music,
  Disc3,
  Star,
  Clock,
  Heart,
  Users,
  ChevronLeft,
  Headphones,
  Globe,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Shuffle,
  UserPlus,
  UserCheck,
  Instagram,
  Twitter,
  Link2,
  Calendar,
  MapPin,
  Award,
  Mic2,
  MessageCircle,
  Send,
  X,
  MessagesSquare,
} from "lucide-react";

function formatStreams(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// getFlag moved to @/utils/get-flag
import { getFlag } from "@/utils/get-flag";

export default function ArtistCataloguePage() {
  const [, params] = useRoute("/artist-catalogue/:id");
  const artistId = params?.id ? parseInt(params.id) : 0;
  const audio = useAudio();
  const [activeTab, setActiveTab] = useState<"discography" | "about">(
    "discography",
  );

  const { data, isLoading } = useArtistDetail(artistId);
  const { data: following } = useUserFollowing();
  const followMutation = useToggleFollow();
  const { data: analytics } = useArtistAnalytics(artistId);
  const { user } = useAuthContext();

  // ─── Message Artist state (music_artist DM — free/ungated for all tiers) ───
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageState, setMessageState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [messageError, setMessageError] = useState<string | null>(null);
  // The key of the message that has not been confirmed yet, so sending the same
  // text again after a lost response cannot store it twice.
  const sendAttemptRef = useRef<SendAttempt | null>(null);
  const [showDiscussions, setShowDiscussions] = useState(false);

  const artist = data?.artist;
  const featuredProfile = getFeaturedArtistByName(artist?.name);
  const resolvedBio = artist?.bio || featuredProfile?.bio.fr.join("\n\n") || "";
  const topTracks = data?.topTracks || [];
  const albums = data?.albums || [];
  const relatedArtists = data?.relatedArtists || [];
  const streamTrend = data?.streamTrend || [];

  const isFollowing = following?.includes(artistId) ?? false;

  if (isLoading) {
    return (
      <TmuShell chrome="site">
        <div className="min-h-[70vh] flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-2 border-purple-500/30 border-t-fuchsia-400 rounded-full"
          />
        </div>
      </TmuShell>
    );
  }

  if (!artist) {
    return (
      <TmuShell chrome="site">
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-white p-4">
          <Mic2 className="w-16 h-16 text-purple-300/40 mb-4" />
          <p className="text-slate-300">Artiste introuvable</p>
          <Link href="/stream">
            <button className="mt-4 px-4 py-2 bg-purple-600/25 border border-purple-400/35 text-purple-200 rounded-xl text-sm hover:bg-purple-600/35">
              Retour au catalogue
            </button>
          </Link>
        </div>
      </TmuShell>
    );
  }

  const handleFollow = () => {
    followMutation.mutate(artistId);
  };

  const playAllTracks = () => {
    if (topTracks.length > 0) {
      audio.playTracks(topTracks);
    }
  };

  const openMessageModal = () => {
    if (!user) {
      // Redirect to sign-in with return-to = current artist page
      window.location.href = `/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setMessageText(`Hi ${artist.name}! Big fan of your music. `);
    setMessageState("idle");
    setMessageError(null);
    setShowMessageModal(true);
  };

  const sendArtistMessage = async () => {
    if (!user || !artist) return;
    const content = messageText.trim();
    if (!content) return;

    // Must have owner user_id to route the DM
    const ownerId = (artist as any).user_id;
    if (!ownerId) {
      setMessageState("error");
      setMessageError(
        "This artist hasn't linked a message inbox yet. Try again later.",
      );
      return;
    }

    setMessageState("sending");
    setMessageError(null);

    try {
      const convRes = await authenticatedFetch("/api/inbox/conversations", {
        method: "POST",
        body: JSON.stringify({
          participantId: String(ownerId),
          participantName: artist.name || "Artist",
          participantAvatar: artist.image_url || null,
          type: "music_artist",
        }),
      });
      const convData = await convRes.json();
      if (!convRes.ok || !convData?.conversation?.id) {
        throw new Error(convData?.error || "Could not open conversation");
      }
      const convId = convData.conversation.id;

      const attempt = nextSendAttempt(sendAttemptRef.current, {
        conversationId: convId,
        content,
      });
      sendAttemptRef.current = attempt;
      const msgRes = await authenticatedFetch(
        `/api/inbox/conversations/${convId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            clientMessageId: attempt.clientMessageId,
          }),
        },
      );
      const msgData = await msgRes.json();
      sendAttemptRef.current = settleSendAttempt(attempt, msgRes);
      if (!msgRes.ok) {
        throw new Error(msgData?.error || "Could not send message");
      }

      setMessageState("sent");
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageState("idle");
        setMessageText("");
      }, 1500);
    } catch (err: any) {
      setMessageState("error");
      setMessageError(err?.message || "Something went wrong. Try again.");
    }
  };

  return (
    <TmuShell chrome="site">
      {/* ═══════════════════════════════════════════ */}
      {/* HERO BANNER */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {artist.cover_image_url && (
          <div className="absolute inset-0">
            <img
              src={artist.cover_image_url}
              alt=""
              className="w-full h-full object-cover opacity-25 blur-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#06020f]/60 via-[#06020f]/80 to-[#06020f]" />
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-8">
          <TmuHubNav currentSurface="stream" className="mb-5" />
          <Link href="/stream">
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/25 bg-[#180d34]/75 px-3 py-1.5 text-slate-200 hover:text-white hover:border-purple-400/45 text-sm transition-colors mb-6">
              <ChevronLeft className="w-4 h-4" />
              Retour
            </button>
          </Link>

          <div className="tmu-glass-elevated rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row items-start gap-6">
            {/* Artist Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden bg-[#180d34] flex-shrink-0 shadow-2xl ring-2 ring-purple-400/35 mx-auto md:mx-0"
            >
              {artist.image_url ? (
                <img
                  src={artist.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                  <span className="text-5xl font-bold text-white uppercase">
                    {artist.name?.[0]}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Artist Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-1.5">
                {artist.verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-500/20 border border-purple-400/35 text-purple-200 text-xs rounded-full font-semibold">
                    <Star className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" /> Artiste Vérifié
                  </span>
                )}
                {artist.label_status && (
                  <span className="px-2.5 py-0.5 bg-[#180d34] border border-purple-500/25 text-slate-200 text-xs rounded-full">
                    {artist.label_status}
                  </span>
                )}
              </div>

              <h1 className="tmu-hero-title text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                {artist.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start text-slate-300 text-sm mb-4">
                {artist.genre && (
                  <span className="flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-fuchsia-300" /> {artist.genre}
                  </span>
                )}
                {artist.country && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-300" />
                    {getFlag(artist.country_code)} {artist.country}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-5 justify-center md:justify-start mb-5 tabular-nums">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {formatStreams(artist.monthly_listeners || 0)}
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">
                    Auditeurs/mois
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {formatStreams(artist.total_streams || 0)}
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">
                    Écoutes totales
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {artist.followers || 0}
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">
                    Abonnés
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {artist.total_tracks || topTracks.length}
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">
                    Titres
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={playAllTracks}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-500/30"
                >
                  <Shuffle className="w-4 h-4" />
                  Écouter
                </motion.button>

                <button
                  onClick={handleFollow}
                  className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 border transition-all ${
                    isFollowing
                      ? "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/45"
                      : "bg-[#180d34]/80 text-slate-200 border-purple-500/25 hover:border-purple-400/50"
                  }`}
                >
                  {isFollowing ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {isFollowing ? "Suivi" : "Suivre"}
                </button>

                <button
                  onClick={openMessageModal}
                  title={
                    user
                      ? "Send a direct message to this artist"
                      : "Sign in to message this artist"
                  }
                  className="px-4 py-2.5 rounded-xl flex items-center gap-1.5 border bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-400/50 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>

                <button
                  onClick={() => setShowDiscussions(true)}
                  className="px-4 py-2.5 rounded-xl flex items-center gap-1.5 border bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all"
                  aria-label={`Open discussions about ${artist.name}`}
                >
                  <MessagesSquare className="w-4 h-4" />
                  Discussions
                </button>

                {featuredProfile && (
                  <Link href={`/artistes/${featuredProfile.slug}`}>
                    <button
                      type="button"
                      className="px-4 py-2.5 rounded-xl flex items-center gap-1.5 border bg-amber-500/15 text-amber-200 border-amber-400/35 hover:bg-amber-500/25 transition-all"
                    >
                      <Award className="w-4 h-4" />
                      Biographie
                    </button>
                  </Link>
                )}

                {/* Social links */}
                {artist.wiki_url && (
                  <a
                    href={artist.wiki_url}
                    target="_blank"
                    rel="noopener"
                    title="Wikipedia"
                    className="px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-all"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                {artist.spotify_url && (
                  <a
                    href={artist.spotify_url}
                    target="_blank"
                    rel="noopener"
                    title="Spotify"
                    className="px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 hover:text-green-400 transition-all"
                  >
                    <Headphones className="w-4 h-4" />
                  </a>
                )}
                {artist.instagram_url && (
                  <a
                    href={artist.instagram_url}
                    target="_blank"
                    rel="noopener"
                    title="Instagram"
                    className="px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 hover:text-pink-400 transition-all"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {artist.twitter_url && (
                  <a
                    href={artist.twitter_url}
                    target="_blank"
                    rel="noopener"
                    title="Twitter"
                    className="px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 hover:text-blue-400 transition-all"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* TABS */}
      {/* ═══════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 mt-6 mb-6">
        <div className="tmu-glass flex gap-1 rounded-xl p-1 w-fit">
          {[
            { key: "discography" as const, label: "Discographie" },
            { key: "about" as const, label: "À propos" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* DISCOGRAPHY TAB */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === "discography" && (
        <div className="max-w-6xl mx-auto px-4">
          {/* Top Tracks */}
          <div className="mb-10">
            <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-fuchsia-300" />
              Titres populaires
            </h3>
            <div className="tmu-glass rounded-2xl overflow-hidden divide-y divide-purple-500/15">
              {topTracks.map((track: any, i: number) => {
                const isCurrent = audio.currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => audio.playTrack(track)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer group transition-all ${
                      isCurrent ? "bg-purple-500/15" : "hover:bg-purple-500/10"
                    }`}
                  >
                    <span
                      className={`w-6 text-center text-sm tabular-nums ${isCurrent ? "text-fuchsia-300 font-bold" : "text-slate-400"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#180d34]">
                      {track.cover_art || track.album_cover ? (
                        <img
                          src={track.cover_art || track.album_cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                          <Music className="w-4 h-4 text-white/70" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${isCurrent ? "text-fuchsia-300" : "text-white"}`}
                      >
                        {track.title}
                      </p>
                      <p className="text-slate-400 text-xs truncate">
                        {track.album_title}
                      </p>
                    </div>
                    <span className="text-slate-400 text-xs hidden sm:inline tabular-nums">
                      {formatStreams(track.streams || 0)}
                    </span>
                    <span className="text-slate-400 text-xs w-10 text-right tabular-nums">
                      {formatDuration(track.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.addToQueue(track);
                      }}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-fuchsia-300 transition-all"
                    >
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Albums */}
          {albums.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-1.5">
                <Disc3 className="w-4 h-4 text-fuchsia-300" />
                Albums & Singles
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {albums.map((album: any) => (
                  <Link
                    key={album.id}
                    href={`/track/${album.tracks?.[0]?.id || album.id}`}
                  >
                    <div className="tmu-glass tmu-interactive-card rounded-2xl p-3 group cursor-pointer">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#180d34] mb-2 shadow-lg">
                        {album.cover_art ? (
                          <img
                            src={album.cover_art}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                            <Disc3 className="w-10 h-10 text-white/60" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-[#06020f]/45 opacity-0 group-hover:opacity-100 transition-all flex items-end justify-end p-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 text-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <p className="text-white text-sm font-medium truncate">
                        {album.title}
                      </p>
                      <p className="text-slate-400 text-xs tabular-nums">
                        {album.release_year ||
                          new Date(album.release_date).getFullYear()}{" "}
                        • {album.album_type || "Album"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stream Trend mini chart */}
          {streamTrend.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-fuchsia-300" />
                Tendance des écoutes (30 jours)
              </h3>
              <div className="tmu-glass rounded-2xl p-4 h-32 flex items-end gap-1">
                {streamTrend.map((d: any, i: number) => {
                  const maxVal = Math.max(
                    ...streamTrend.map((s: any) => s.streams || s.count || 1),
                  );
                  const height = ((d.streams || d.count || 0) / maxVal) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-purple-600 to-fuchsia-400 rounded-t opacity-70 hover:opacity-100 transition-opacity cursor-default"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${d.date}: ${d.streams || d.count} streams`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ABOUT TAB */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === "about" && (
        <div className="max-w-[95vw] mx-auto px-4">
          {/* Bio */}
          {resolvedBio && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">
                Biographie
              </h3>
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30">
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">
                  {resolvedBio}
                </p>
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {artist.country && (
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <p className="text-gray-400 text-xs mb-1">Pays</p>
                <p className="text-white text-sm">
                  {getFlag(artist.country_code)} {artist.country}
                </p>
              </div>
            )}
            {artist.genre && (
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <p className="text-gray-400 text-xs mb-1">Genre</p>
                <p className="text-white text-sm">{artist.genre}</p>
              </div>
            )}
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1">Écoutes totales</p>
              <p className="text-white text-sm">
                {formatStreams(artist.total_streams || 0)}
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1">Auditeurs mensuels</p>
              <p className="text-white text-sm">
                {formatStreams(artist.monthly_listeners || 0)}
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1">Albums</p>
              <p className="text-white text-sm">
                {artist.total_albums || albums.length}
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-400 text-xs mb-1">Abonnés</p>
              <p className="text-white text-sm">
                {formatStreams(artist.followers || 0)}
              </p>
            </div>
          </div>

          {/* External links */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">Liens</h3>
            <div className="flex flex-wrap gap-2">
              {artist.wiki_url && (
                <a
                  href={artist.wiki_url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <Globe className="w-4 h-4" /> Wikipedia
                </a>
              )}
              {artist.spotify_url && (
                <a
                  href={artist.spotify_url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-green-400 text-sm transition-colors"
                >
                  <Headphones className="w-4 h-4" /> Spotify
                </a>
              )}
              {artist.instagram_url && (
                <a
                  href={artist.instagram_url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-pink-400 text-sm transition-colors"
                >
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {artist.twitter_url && (
                <a
                  href={artist.twitter_url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-blue-400 text-sm transition-colors"
                >
                  <Twitter className="w-4 h-4" /> Twitter
                </a>
              )}
              {artist.website_url && (
                <a
                  href={artist.website_url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 hover:text-amber-400 text-sm transition-colors"
                >
                  <Link2 className="w-4 h-4" /> Site web
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* RELATED ARTISTS */}
      {/* ═══════════════════════════════════════════ */}
      {relatedArtists.length > 0 && (
        <section className="max-w-[95vw] mx-auto px-4 mt-8 mb-16">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-amber-400" />
            Artistes similaires
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {relatedArtists.map((ra: any) => (
              <Link key={ra.id} href={`/artist-catalogue/${ra.id}`}>
                <div className="flex-shrink-0 w-28 text-center group cursor-pointer">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-800 mb-2 ring-2 ring-gray-800 group-hover:ring-amber-500/50 transition-all">
                    {ra.image_url ? (
                      <img
                        src={ra.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                        <span className="text-xl font-bold text-white/50">
                          {ra.name?.[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-white text-xs font-medium truncate">
                    {ra.name}
                  </p>
                  <p className="text-gray-400 text-[10px]">{ra.genre}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Sheet open={showDiscussions} onOpenChange={setShowDiscussions}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-white/10 bg-slate-950 p-4 text-white sm:max-w-xl sm:p-6"
        >
          <SheetHeader className="mb-4 pr-8">
            <SheetTitle className="text-left text-white">
              Discussions autour de {artist.name}
            </SheetTitle>
            <SheetDescription className="text-left text-slate-400">
              Rejoignez les conversations de la communauté Musical Universe sans
              quitter cette page.
            </SheetDescription>
          </SheetHeader>
          <ThreadFeedWidget
            postType="musical_universe"
            title="Musical Universe Community"
            composerPlaceholder={`Parlez de ${artist.name}...`}
            limit={8}
            variant="dark"
            showViewAll={false}
            className="border-white/10 bg-white/[0.04]"
          />
        </SheetContent>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MESSAGE ARTIST MODAL — free/ungated music_artist DM         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showMessageModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md tmu-glass-modal rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    Message {artist.name}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Direct message — free for all fans
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="p-1.5 rounded-lg hover:bg-purple-500/20 text-slate-300 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              {messageState === "sent" ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                    <Send className="w-5 h-5 text-fuchsia-300" />
                  </div>
                  <p className="text-white font-semibold">Message sent!</p>
                  <p className="text-slate-300 text-xs mt-1">
                    You&apos;ll see the reply in your inbox.
                  </p>
                </div>
              ) : (
                <>
                  {messageError && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
                      {messageError}
                    </div>
                  )}
                  <textarea
                    value={messageText}
                    onChange={(e) =>
                      setMessageText(e.target.value.slice(0, 1000))
                    }
                    placeholder="Write a message…"
                    rows={5}
                    className="w-full bg-[#090418] border border-purple-500/25 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-400 focus:outline-none focus:border-fuchsia-400 resize-none"
                    disabled={messageState === "sending"}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-400 text-[11px] tabular-nums">
                      {messageText.length}/1000
                    </span>
                    <button
                      onClick={sendArtistMessage}
                      disabled={
                        !messageText.trim() || messageState === "sending"
                      }
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {messageState === "sending" ? "Sending…" : "Send"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 bg-[#090418] border-t border-purple-500/20">
              <p className="text-slate-400 text-[11px] text-center">
                Direct messaging is free for all fans · Rate-limited to prevent
                spam
              </p>
            </div>
          </div>
        </div>
      )}
    </TmuShell>
  );
}

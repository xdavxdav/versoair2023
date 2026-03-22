/**
 * Artist Catalogue Page — /artist-catalogue/:id
 * Full artist profile: bio, discography, stats, social
 */
import { useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useAudio } from "@/lib/audio-context";
import {
  useArtistDetail,
  useToggleFollow,
  useUserFollowing,
  useArtistAnalytics,
} from "@/hooks/use-streaming";
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

function getFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

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

  const artist = data?.artist;
  const topTracks = data?.topTracks || [];
  const albums = data?.albums || [];
  const relatedArtists = data?.relatedArtists || [];
  const streamTrend = data?.streamTrend || [];

  const isFollowing = following?.some((f: any) => f.artist_id === artistId);

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

  if (!artist) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center text-white">
        <Mic2 className="w-16 h-16 text-gray-700 mb-4" />
        <p className="text-gray-400">Artiste introuvable</p>
        <Link href="/stream">
          <button className="mt-4 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm">
            Retour au catalogue
          </button>
        </Link>
      </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-28">
      {/* ═══════════════════════════════════════════ */}
      {/* HERO BANNER */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-gray-900/90 to-gray-950" />
        {artist.cover_image_url && (
          <div className="absolute inset-0">
            <img
              src={artist.cover_image_url}
              alt=""
              className="w-full h-full object-cover opacity-20 blur-xl"
            />
          </div>
        )}

        <div className="relative max-w-[95vw] mx-auto px-4 pt-6 pb-8">
          <Link href="/stream">
            <button className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-8">
              <ChevronLeft className="w-4 h-4" />
              Retour
            </button>
          </Link>

          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Artist Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex-shrink-0 shadow-2xl ring-2 ring-amber-500/20 mx-auto md:mx-0"
            >
              {artist.image_url ? (
                <img
                  src={artist.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                  <span className="text-5xl font-bold text-white/30">
                    {artist.name?.[0]}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Artist Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                {artist.verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full">
                    <Star className="w-2.5 h-2.5" /> Artiste Vérifié
                  </span>
                )}
                {artist.label_status && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded-full">
                    {artist.label_status}
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {artist.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start text-gray-400 text-sm mb-4">
                {artist.genre && (
                  <span className="flex items-center gap-1">
                    <Music className="w-3.5 h-3.5" /> {artist.genre}
                  </span>
                )}
                {artist.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {getFlag(artist.country_code)} {artist.country}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-5">
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {formatStreams(artist.monthly_listeners || 0)}
                  </p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                    Auditeurs/mois
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {formatStreams(artist.total_streams || 0)}
                  </p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                    Écoutes totales
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {artist.followers || 0}
                  </p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                    Abonnés
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {artist.total_tracks || topTracks.length}
                  </p>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                    Titres
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={playAllTracks}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Shuffle className="w-4 h-4" />
                  Écouter
                </motion.button>

                <button
                  onClick={handleFollow}
                  className={`px-4 py-2.5 rounded-xl flex items-center gap-1.5 border transition-all ${
                    isFollowing
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-gray-800/50 text-gray-400 border-gray-700 hover:border-amber-500/30"
                  }`}
                >
                  {isFollowing ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {isFollowing ? "Suivi" : "Suivre"}
                </button>

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
      <div className="max-w-[95vw] mx-auto px-4 mt-6 mb-6">
        <div className="flex gap-1 bg-gray-800/30 rounded-lg p-1 w-fit">
          {[
            { key: "discography" as const, label: "Discographie" },
            { key: "about" as const, label: "À propos" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm transition-all ${
                activeTab === tab.key
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-gray-400 hover:text-white"
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
        <div className="max-w-[95vw] mx-auto px-4">
          {/* Top Tracks */}
          <div className="mb-10">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Titres populaires
            </h3>
            <div className="space-y-0.5">
              {topTracks.map((track: any, i: number) => {
                const isCurrent = audio.currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => audio.playTrack(track)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer group transition-all ${
                      isCurrent ? "bg-amber-500/10" : "hover:bg-gray-800/50"
                    }`}
                  >
                    <span
                      className={`w-6 text-center text-sm ${isCurrent ? "text-amber-400 font-bold" : "text-gray-600"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                      {track.cover_art || track.album_cover ? (
                        <img
                          src={track.cover_art || track.album_cover}
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
                        className={`text-sm font-medium truncate ${isCurrent ? "text-amber-400" : "text-white"}`}
                      >
                        {track.title}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {track.album_title}
                      </p>
                    </div>
                    <span className="text-gray-600 text-xs hidden sm:inline">
                      {formatStreams(track.streams || 0)}
                    </span>
                    <span className="text-gray-600 text-xs w-10 text-right">
                      {formatDuration(track.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.addToQueue(track);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-amber-400 transition-all"
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
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
                <Disc3 className="w-4 h-4 text-amber-400" />
                Albums & Singles
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {albums.map((album: any) => (
                  <Link
                    key={album.id}
                    href={`/track/${album.tracks?.[0]?.id || album.id}`}
                  >
                    <div className="group cursor-pointer">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 mb-2 shadow-lg">
                        {album.cover_art ? (
                          <img
                            src={album.cover_art}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-800 to-orange-900 flex items-center justify-center">
                            <Disc3 className="w-10 h-10 text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-end justify-end p-2">
                          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 text-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <p className="text-white text-sm font-medium truncate">
                        {album.title}
                      </p>
                      <p className="text-gray-500 text-xs">
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
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Tendance des écoutes (30 jours)
              </h3>
              <div className="bg-gray-800/30 rounded-xl p-4 h-32 flex items-end gap-1">
                {streamTrend.map((d: any, i: number) => {
                  const maxVal = Math.max(
                    ...streamTrend.map((s: any) => s.streams || s.count || 1),
                  );
                  const height = ((d.streams || d.count || 0) / maxVal) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t opacity-60 hover:opacity-100 transition-opacity cursor-default"
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
          {artist.bio && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Biographie
              </h3>
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/30">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {artist.bio}
                </p>
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {artist.country && (
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <p className="text-gray-500 text-xs mb-1">Pays</p>
                <p className="text-white text-sm">
                  {getFlag(artist.country_code)} {artist.country}
                </p>
              </div>
            )}
            {artist.genre && (
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                <p className="text-gray-500 text-xs mb-1">Genre</p>
                <p className="text-white text-sm">{artist.genre}</p>
              </div>
            )}
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-500 text-xs mb-1">Écoutes totales</p>
              <p className="text-white text-sm">
                {formatStreams(artist.total_streams || 0)}
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-500 text-xs mb-1">Auditeurs mensuels</p>
              <p className="text-white text-sm">
                {formatStreams(artist.monthly_listeners || 0)}
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-500 text-xs mb-1">Albums</p>
              <p className="text-white text-sm">
                {artist.total_albums || albums.length}
              </p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <p className="text-gray-500 text-xs mb-1">Abonnés</p>
              <p className="text-white text-sm">
                {formatStreams(artist.followers || 0)}
              </p>
            </div>
          </div>

          {/* External links */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Liens</h3>
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
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-1.5">
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
                        <span className="text-xl font-bold text-white/40">
                          {ra.name?.[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-white text-xs font-medium truncate">
                    {ra.name}
                  </p>
                  <p className="text-gray-500 text-[10px]">{ra.genre}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

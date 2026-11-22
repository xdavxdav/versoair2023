/**
 * Dedicated Artist Biography Page — /artistes/:slug
 * Verified artist profile, career biography, discography metadata, and official links.
 */
import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import {
  ChevronLeft,
  Disc3,
  ExternalLink,
  Globe,
  Headphones,
  Instagram,
  MapPin,
  Mic2,
  Music,
  Newspaper,
  Sparkles,
  Users,
  Youtube,
} from "lucide-react";
import { getFeaturedArtistBySlug, type FeaturedArtistLink } from "@shared/featured-artists";
import { TmuHubNav } from "@/components/music/TmuHubNav";
import { TmuShell } from "@/components/music/TmuShell";
import { useLanguage } from "@/components/LanguageSwitcher";
import { getFlag } from "@/utils/get-flag";

const KIND_LABELS: Record<string, { fr: string; en: string }> = {
  album: { fr: "Album", en: "Album" },
  single: { fr: "Single", en: "Single" },
  compilation: { fr: "Compilation", en: "Compilation" },
  clips: { fr: "Clips", en: "Videos" },
};

function LinkIcon({ platform }: { platform: FeaturedArtistLink["platform"] }) {
  switch (platform) {
    case "youtube":
      return <Youtube className="h-4 w-4 text-rose-400" />;
    case "spotify":
      return <Headphones className="h-4 w-4 text-emerald-400" />;
    case "soundcloud":
      return <Headphones className="h-4 w-4 text-orange-400" />;
    case "instagram":
      return <Instagram className="h-4 w-4 text-pink-400" />;
    case "press":
      return <Newspaper className="h-4 w-4 text-amber-300" />;
    default:
      return <Globe className="h-4 w-4 text-purple-300" />;
  }
}

export default function ArtistBioPage() {
  const [, params] = useRoute("/artistes/:slug");
  const artist = getFeaturedArtistBySlug(params?.slug);
  const { currentLang } = useLanguage();
  const isFr = currentLang.toLowerCase().startsWith("fr");
  const lang = isFr ? "fr" : "en";

  useEffect(() => {
    if (artist) {
      document.title = isFr
        ? `${artist.stageName} — Biographie | Verso Air Musical Universe`
        : `${artist.stageName} — Biography | Verso Air Musical Universe`;
    }
  }, [artist, isFr]);

  if (!artist) {
    return (
      <TmuShell chrome="site">
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center text-white">
          <Mic2 className="h-14 w-14 text-purple-300/40 mb-4" />
          <h1 className="text-xl font-bold mb-2">
            {isFr ? "Biographie introuvable" : "Biography not found"}
          </h1>
          <p className="text-sm text-slate-300 mb-6 max-w-md">
            {isFr
              ? "Cette page artiste n'existe pas encore dans The Musical Universe."
              : "This artist profile is not available yet in The Musical Universe."}
          </p>
          <div className="flex gap-3">
            <Link href="/artistes">
              <button
                type="button"
                className="rounded-xl border border-purple-400/35 bg-purple-600/25 px-4 py-2 text-sm font-medium text-purple-100 hover:bg-purple-600/35"
              >
                {isFr ? "Annuaire artistes" : "Artist directory"}
              </button>
            </Link>
            <Link href="/stream">
              <button
                type="button"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                {isFr ? "Retour au Stream" : "Back to Stream"}
              </button>
            </Link>
          </div>
        </div>
      </TmuShell>
    );
  }

  return (
    <TmuShell chrome="site">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-16">
        <TmuHubNav currentSurface="stream" className="mb-5" />

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link href="/stream">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/25 bg-[#180d34]/75 px-3 py-1.5 text-sm text-slate-200 hover:border-purple-400/45 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {isFr ? "Retour à TMU Stream" : "Back to TMU Stream"}
            </button>
          </Link>
          <Link href="/artistes">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:border-purple-400/40 hover:text-white transition-colors"
            >
              {isFr ? "Annuaire artistes" : "Artist directory"}
            </button>
          </Link>
        </div>

        {/* Hero Profile Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-fuchsia-400/30 bg-[linear-gradient(135deg,#160934_0%,#240d4e_55%,#0e0522_100%)] p-6 sm:p-8 shadow-2xl shadow-purple-950/60 mb-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"
          />
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Monogram emblem */}
            <div className="flex-shrink-0">
              <div className="flex h-36 w-36 sm:h-40 sm:w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-amber-500 p-[2px] shadow-2xl shadow-fuchsia-950/60">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-[14px] bg-[#0b041c]">
                  <span
                    translate="no"
                    className="notranslate bg-gradient-to-br from-white via-fuchsia-200 to-amber-200 bg-clip-text text-5xl font-black tracking-tight text-transparent"
                  >
                    {artist.monogram || artist.stageName.slice(0, 2).toUpperCase()}
                  </span>
                  {(artist.city || artist.countryCode) && (
                    <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300 notranslate" translate="no">
                      {artist.countryCode ? `${getFlag(artist.countryCode)} ` : ""}
                      {artist.city || artist.countryName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                {artist.featuredFaceOfTmu && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    {isFr ? "Artiste à la une · TMU" : "Featured Artist · TMU"}
                  </span>
                )}
                {(artist.city || artist.countryName) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-100">
                    <MapPin className="h-3.5 w-3.5 text-fuchsia-300" />
                    {artist.countryCode ? `${getFlag(artist.countryCode)} ` : ""}
                    {[artist.city, artist.countryName].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>

              <h1
                translate="no"
                className="notranslate tmu-hero-title text-4xl sm:text-5xl font-extrabold tracking-tight mb-2"
              >
                {artist.stageName}
              </h1>

              {artist.aliases.length > 0 && (
                <p className="text-sm text-fuchsia-200/85 mb-3">
                  {isFr ? "Également connu sous :" : "Also known as:"}{" "}
                  <span translate="no" className="notranslate font-semibold text-white">
                    {artist.aliases.join(" · ")}
                  </span>
                </p>
              )}

              <p className="text-base text-slate-200 leading-relaxed max-w-2xl mb-4">
                {artist.tagline[lang]}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {artist.genres.map((genre) => (
                  <span
                    key={genre}
                    translate="no"
                    className="notranslate inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-[#180d34]/80 px-3 py-1 text-xs font-semibold text-purple-100"
                  >
                    <Music className="h-3.5 w-3.5 text-fuchsia-300" />
                    {genre}
                  </span>
                ))}
                {artist.group && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-[#180d34]/80 px-3 py-1 text-xs font-semibold text-amber-100">
                    <Users className="h-3.5 w-3.5 text-amber-300" />
                    <span translate="no" className="notranslate">
                      {artist.group}
                      {artist.groupMembers.length > 0
                        ? ` (${artist.groupMembers.join(" & ")})`
                        : ""}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 cols: Biography + Discography */}
          <div className="lg:col-span-2 space-y-6">
            {/* Biography */}
            <section className="tmu-glass-elevated rounded-2xl p-6 sm:p-7">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Mic2 className="h-5 w-5 text-fuchsia-300" />
                {isFr ? "Biographie" : "Biography"}
              </h2>
              <div className="space-y-4 text-sm sm:text-[15px] leading-relaxed text-slate-200">
                {artist.bio[lang].map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Discography timeline (verified public metadata only) */}
            {artist.discography.length > 0 && (
            <section className="tmu-glass-elevated rounded-2xl p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Disc3 className="h-5 w-5 text-fuchsia-300" />
                  {isFr ? "Repères discographiques" : "Selected Discography"}
                </h2>
                <span className="text-xs text-slate-400">
                  {isFr ? "Métadonnées publiques vérifiées" : "Verified public metadata"}
                </span>
              </div>

              <div className="divide-y divide-purple-500/15">
                {artist.discography.map((release) => {
                  const primaryLink = release.mediaLinks[0];
                  return (
                    <div
                      key={`${release.year}-${release.title}`}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4"
                    >
                      <span
                        translate="no"
                        className="notranslate inline-flex w-14 flex-shrink-0 items-center justify-center rounded-lg border border-purple-400/25 bg-purple-500/15 px-2 py-1 text-xs font-bold tabular-nums text-fuchsia-200"
                      >
                        {release.year}
                      </span>
                      <div className="flex-1 min-w-0">
                        {primaryLink ? (
                          <a
                            href={primaryLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            translate="no"
                            className="notranslate inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-fuchsia-300 transition-colors"
                          >
                            <span>{release.title}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-fuchsia-300/80 flex-shrink-0" />
                          </a>
                        ) : (
                          <p translate="no" className="notranslate text-sm font-semibold text-white">
                            {release.title}
                          </p>
                        )}
                        <p className="text-xs text-slate-300 mt-0.5">{release.note[lang]}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                          {KIND_LABELS[release.kind]?.[lang] ?? release.kind}
                        </span>
                        {release.mediaLinks.map((media) => (
                          <a
                            key={`${release.title}-${media.url}-${media.label}`}
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            translate="no"
                            className={`notranslate inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                              media.platform === "spotify"
                                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                                : media.platform === "soundcloud"
                                  ? "border-orange-400/35 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25"
                                  : media.platform === "youtube" || media.platform === "youtube_music"
                                    ? "border-rose-400/35 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
                                    : "border-purple-400/35 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25"
                            }`}
                          >
                            {media.platform === "spotify" || media.platform === "soundcloud" ? (
                              <Headphones className="h-3 w-3" />
                            ) : media.platform === "youtube" || media.platform === "youtube_music" ? (
                              <Youtube className="h-3 w-3" />
                            ) : (
                              <Globe className="h-3 w-3" />
                            )}
                            {media.label}
                            <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Direct hosting roadmap notice */}
              <div className="mt-5 rounded-xl border border-purple-400/25 bg-[#0c0520]/80 p-4 text-xs sm:text-sm text-slate-300">
                {isFr
                  ? "En attendant l'hébergement direct des médias sur Verso Air, chaque titre redirige vers la plateforme officielle où il est disponible (YouTube, Spotify, SoundCloud, YouTube Music)."
                  : "While direct media hosting on Verso Air is being prepared, each release routes directly to the official platform where it is currently available (YouTube, Spotify, SoundCloud, YouTube Music)."}
              </div>
            </section>
            )}
          </div>

          {/* Right col: Key facts + Official links + Press */}
          <div className="space-y-6">
            <section className="tmu-glass-elevated rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4">
                {isFr ? "Fiche d'identité artistique" : "Artist Profile"}
              </h2>
              <dl className="space-y-3 text-sm">
                {(artist.city || artist.countryName) && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-400">
                      {isFr ? "Origine" : "Origin"}
                    </dt>
                    <dd className="text-white font-medium mt-0.5">
                      {artist.countryCode ? `${getFlag(artist.countryCode)} ` : ""}
                      {[artist.city, artist.countryName].filter(Boolean).join(", ")}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wider text-slate-400">
                    {isFr ? "Style principal" : "Primary Style"}
                  </dt>
                  <dd className="text-white font-medium mt-0.5">{artist.primaryGenre}</dd>
                </div>
                {artist.group && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-400">
                      {isFr ? "Groupe / Duo" : "Group / Duo"}
                    </dt>
                    <dd className="text-white font-medium mt-0.5">
                      <span translate="no" className="notranslate">
                        {artist.group}
                        {artist.groupMembers.length > 0
                          ? ` (${artist.groupMembers.join(" & ")})`
                          : ""}
                      </span>
                    </dd>
                  </div>
                )}
                {artist.aliases.length > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-400">
                      {isFr ? "Surnoms" : "Aliases"}
                    </dt>
                    <dd translate="no" className="notranslate text-white font-medium mt-0.5">
                      {artist.aliases.join(", ")}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="tmu-glass-elevated rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-3">
                {isFr ? "Liens officiels" : "Official Links"}
              </h2>
              <div className="space-y-2">
                {artist.officialLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-xl border border-purple-500/20 bg-[#140a2d]/80 px-3.5 py-2.5 text-sm text-slate-200 hover:border-fuchsia-400/45 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 truncate">
                      <LinkIcon platform={link.platform} />
                      <span translate="no" className="notranslate truncate">{link.label}</span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            </section>

            {artist.pressLinks.length > 0 && (
              <section className="tmu-glass-elevated rounded-2xl p-6">
                <h2 className="text-base font-bold text-white mb-3">
                  {isFr ? "Presse & Références" : "Press & References"}
                </h2>
                <div className="space-y-2">
                  {artist.pressLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-200 hover:border-amber-400/40 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2.5 min-w-0 truncate">
                        <LinkIcon platform={link.platform} />
                        <span className="truncate">{link.label}</span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </TmuShell>
  );
}
